from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routers.mindmap.router import router as mindmap_routers

app = FastAPI()

# Get the directory where main.py is located
BASE_DIR = Path(__file__).resolve().parent

# Mount static files (CSS, JS, images)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# Include mindmap router
app.include_router(mindmap_routers, prefix="/mindmap")


@app.get("/")
async def serve_homepage():
    """Serve the main homepage"""
    return FileResponse(BASE_DIR / "static" / "index.html")