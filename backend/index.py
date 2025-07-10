from server import app
from mangum import Mangum

# Create the ASGI handler for Vercel
handler = Mangum(app)