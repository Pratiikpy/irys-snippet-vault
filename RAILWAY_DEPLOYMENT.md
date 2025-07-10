# Railway Deployment Configuration

## Start Command
uvicorn backend.server:app --host 0.0.0.0 --port $PORT

## Environment Variables (set in Railway dashboard)
CLAUDE_API_KEY=your_claude_key
IRYS_PRIVATE_KEY=your_irys_key  
MONGO_URL=your_mongodb_url
DB_NAME=your_db_name

## Build Process
Railway will auto-detect:
- Python backend (requirements.txt)
- Node.js for Irys (package.json)
- React frontend build

## Advantages
✅ Handles full-stack automatically
✅ Built-in MongoDB service
✅ Environment variables easy
✅ GitHub auto-deploy
✅ Better for complex apps like yours