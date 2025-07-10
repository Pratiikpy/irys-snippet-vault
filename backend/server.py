from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
import re
from emergentintegrations.llm.chat import LlmChat, UserMessage
import subprocess
import json
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Irys Snippet Vault API - Social Features")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class UrlSnippetRequest(BaseModel):
    url: str

class UrlSnippetResponse(BaseModel):
    url: str
    title: str
    snippet: str
    
class SummarizeRequest(BaseModel):
    snippet: str
    url: str
    title: str

class SummarizeResponse(BaseModel):
    summary: str
    tags: List[str]

class IrysUploadRequest(BaseModel):
    data: str
    signature: str
    address: str
    tags: List[dict] = []

class IrysUploadResponse(BaseModel):
    id: str
    gateway_url: str
    timestamp: int
    message: str

class SnippetMetadata(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet_address: str
    irys_id: str
    url: str
    title: str
    summary: str
    tags: List[str]
    network: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SnippetMetadataCreate(BaseModel):
    wallet_address: str
    irys_id: str
    url: str
    title: str
    summary: str
    tags: List[str]
    network: str

# Initialize Irys service
async def init_irys_service():
    """Initialize the Node.js Irys service"""
    try:
        result = subprocess.run(
            ['node', 'irys_service.js'],
            cwd=ROOT_DIR,
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            print("✅ Irys service initialized successfully")
            return True
        else:
            print(f"❌ Irys service initialization failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error initializing Irys service: {e}")
        return False

async def call_irys_service(action, data=None):
    """Call the Node.js Irys service"""
    try:
        script = f"""
const irysService = require('./irys_service.js');

async function main() {{
    await irysService.initialize();
    
    try {{
        let result;
        if ('{action}' === 'upload') {{
            const data = {json.dumps(data.get('content', ''))};
            const tags = {json.dumps(data.get('tags', []))};
            result = await irysService.uploadData(data, tags);
        }} else if ('{action}' === 'balance') {{
            result = await irysService.getBalance();
        }}
        
        console.log(JSON.stringify(result));
    }} catch (error) {{
        console.error('Error:', error.message);
        process.exit(1);
    }}
}}

main();
"""
        
        # Write temporary script
        script_path = ROOT_DIR / 'temp_irys_call.js'
        with open(script_path, 'w') as f:
            f.write(script)
        
        # Execute script
        result = subprocess.run(
            ['node', 'temp_irys_call.js'],
            cwd=ROOT_DIR,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        # Cleanup
        if script_path.exists():
            script_path.unlink()
        
        if result.returncode == 0:
            # Parse the JSON output from the last line
            output_lines = result.stdout.strip().split('\n')
            json_output = output_lines[-1]
            return json.loads(json_output)
        else:
            raise Exception(f"Irys service error: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Error calling Irys service: {e}")
        raise HTTPException(status_code=500, detail=f"Irys service error: {str(e)}")

# Utility functions
def clean_text(text: str) -> str:
    """Clean extracted text by removing extra whitespace and special characters."""
    text = re.sub(r'\s+', ' ', text.strip())
    text = re.sub(r'[^\w\s.,!?;:"()-]', '', text)
    return text

def extract_meaningful_content(soup):
    """Extract meaningful content from webpage."""
    # Remove script and style elements
    for script in soup(["script", "style", "nav", "header", "footer", "aside"]):
        script.decompose()
    
    # Try to find main content areas
    content_selectors = [
        'article', 'main', '.content', '.post', '.entry-content', 
        '.article-body', '.story-body', '.post-content', '#content'
    ]
    
    content = ""
    for selector in content_selectors:
        elements = soup.select(selector)
        if elements:
            content = ' '.join([elem.get_text() for elem in elements])
            break
    
    # Fallback to body if no content found
    if not content:
        body = soup.find('body')
        if body:
            content = body.get_text()
    
    return clean_text(content)

# Routes
@api_router.get("/")
async def root():
    return {"message": "Irys Snippet Vault API - Real Blockchain Integration Active"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

@api_router.post("/extract-snippet", response_model=UrlSnippetResponse)
async def extract_snippet(request: UrlSnippetRequest):
    """Extract title and content snippet from a URL."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(request.url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract title
        title = soup.find('title')
        title_text = title.get_text().strip() if title else "No title found"
        
        # Extract meaningful content
        content = extract_meaningful_content(soup)
        
        # Limit snippet length
        snippet = content[:2000] + "..." if len(content) > 2000 else content
        
        return UrlSnippetResponse(
            url=request.url,
            title=title_text,
            snippet=snippet
        )
        
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Error fetching URL: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing content: {str(e)}")

@api_router.post("/summarize", response_model=SummarizeResponse)
async def summarize_snippet(request: SummarizeRequest):
    """Summarize snippet and generate tags using Claude AI."""
    try:
        claude_api_key = os.environ.get('CLAUDE_API_KEY')
        if not claude_api_key:
            raise HTTPException(status_code=500, detail="Claude API key not configured")
        
        # Create Claude chat instance
        chat = LlmChat(
            api_key=claude_api_key,
            session_id=f"summarize-{uuid.uuid4()}",
            system_message="You are a text summarization expert. For each text snippet provided, you must respond with exactly one sentence summary followed by a pipe symbol '|' and then exactly 3 topical tags separated by commas. Format: 'Summary sentence here|tag1,tag2,tag3'"
        ).with_model("anthropic", "claude-3-5-sonnet-20241022")
        
        # Create user message
        user_message = UserMessage(
            text=f"Please summarize this web snippet from '{request.title}' ({request.url}) and provide 3 topical tags. Content: {request.snippet}"
        )
        
        # Get response from Claude
        response = await chat.send_message(user_message)
        
        # Parse response
        if '|' in response:
            summary, tags_str = response.split('|', 1)
            tags = [tag.strip() for tag in tags_str.split(',')][:3]  # Ensure max 3 tags
        else:
            # Fallback parsing
            summary = response.strip()
            tags = ["web", "content", "snippet"]
        
        # Clean up summary
        summary = summary.strip()
        if not summary.endswith('.'):
            summary += '.'
        
        return SummarizeResponse(
            summary=summary,
            tags=tags
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error summarizing content: {str(e)}")

@api_router.post("/irys-upload", response_model=IrysUploadResponse)
async def upload_to_irys_blockchain(request: IrysUploadRequest):
    """Upload data to REAL Irys blockchain."""
    try:
        # Parse the data to get network info
        data_obj = json.loads(request.data)
        network = data_obj.get('network', 'devnet')
        
        print(f"🔗 Uploading to Irys {network} for wallet: {request.address}")
        
        # Prepare tags for blockchain storage
        tags = [
            {"name": "application-id", "value": "IrysSnippetVault"},
            {"name": "user", "value": request.address},
            {"name": "network", "value": network},
            {"name": "signature", "value": request.signature},
            *request.tags
        ]
        
        # Call Irys service to upload to blockchain
        result = await call_irys_service('upload', {
            'content': request.data,
            'tags': tags,
            'network': network
        })
        
        print(f"✅ Successfully uploaded to Irys {network}: {result['id']}")
        
        # Determine gateway URL based on network
        if network == 'devnet':
            gateway_url = f"https://devnet.irys.xyz/{result['id']}"
        else:
            gateway_url = f"https://gateway.irys.xyz/{result['id']}"
        
        # Save metadata to our database for querying
        metadata = {
            "wallet_address": request.address,
            "irys_id": result['id'],
            "gateway_url": gateway_url,
            "timestamp": datetime.utcnow(),
            "network": network,
            "size": result.get('size', 0)
        }
        await db.irys_uploads.insert_one(metadata)
        
        return IrysUploadResponse(
            id=result['id'],
            gateway_url=gateway_url,
            timestamp=result.get('timestamp', int(datetime.utcnow().timestamp() * 1000)),
            message=f"Successfully uploaded to Irys {network}! {'FREE' if network == 'devnet' else 'Paid'} storage."
        )
        
    except Exception as e:
        print(f"❌ Irys upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Blockchain upload failed: {str(e)}")

@api_router.get("/irys-query/{wallet_address}")
async def query_irys_snippets(wallet_address: str):
    """Query snippets from Irys blockchain for a wallet."""
    try:
        print(f"🔍 Querying Irys blockchain for wallet: {wallet_address}")
        
        # Query our database for Irys uploads from this wallet
        uploads = await db.irys_uploads.find({"wallet_address": wallet_address}).to_list(1000)
        
        snippets = []
        for upload in uploads:
            try:
                # Fetch the actual data from Irys gateway
                gateway_url = f"https://gateway.irys.xyz/{upload['irys_id']}"
                response = requests.get(gateway_url, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    snippets.append({
                        "id": upload['irys_id'],
                        "irys_id": upload['irys_id'],
                        "url": data.get('url', ''),
                        "title": data.get('title', 'Untitled'),
                        "summary": data.get('summary', ''),
                        "tags": data.get('tags', []),
                        "timestamp": upload['timestamp'],
                        "gateway_url": gateway_url,
                        "network": "irys"
                    })
            except Exception as e:
                print(f"⚠️ Error fetching snippet {upload['irys_id']}: {e}")
                continue
        
        print(f"✅ Found {len(snippets)} snippets for wallet {wallet_address}")
        return {"snippets": snippets}
        
    except Exception as e:
        print(f"❌ Query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

@api_router.post("/save-snippet-metadata", response_model=SnippetMetadata)
async def save_snippet_metadata(request: SnippetMetadataCreate):
    """Save snippet metadata to database (backup/legacy)."""
    try:
        metadata = SnippetMetadata(**request.dict())
        await db.snippet_metadata.insert_one(metadata.dict())
        return metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving metadata: {str(e)}")

@api_router.get("/snippets/{wallet_address}")
async def get_user_snippets(wallet_address: str):
    """Get all snippets for a wallet address (legacy/backup)."""
    try:
        snippets = await db.snippet_metadata.find({"wallet_address": wallet_address}).to_list(1000)
        # Convert ObjectId to string for JSON serialization
        for snippet in snippets:
            if "_id" in snippet:
                snippet["_id"] = str(snippet["_id"])
        return {"snippets": snippets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching snippets: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    print("🚀 Starting Irys Snippet Vault API...")
    
    # Initialize Irys service
    irys_ready = await init_irys_service()
    if irys_ready:
        print("✅ Irys blockchain integration ready!")
    else:
        print("⚠️ Irys service initialization failed - some features may not work")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()