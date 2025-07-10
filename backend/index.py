from server import app

# This is the critical entry point for Vercel
# Export the FastAPI app as 'handler' for Vercel serverless functions
handler = app