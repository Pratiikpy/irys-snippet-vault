from mangum import Mangum
from server import app

# Create the Mangum handler for Vercel
handler = Mangum(app, lifespan="off")

# Export the app for direct access
__all__ = ["handler", "app"]