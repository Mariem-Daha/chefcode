from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import uvicorn
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables from .env file
load_dotenv()

from database import SessionLocal, engine
import models
from routes import inventory, recipes, tasks, chat, data, actions, ocr, web_recipes, ai_assistant

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ChefCode Backend",
    description="FastAPI backend for ChefCode inventory management system",
    version="1.0.0"
)

# CORS configuration to allow frontend connections
# In production, replace with specific frontend URLs
# Allow all origins for development (includes file:// protocol and localhost)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",") if os.getenv("ALLOWED_ORIGINS") != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Include routers
app.include_router(inventory.router, prefix="/api", tags=["inventory"])
app.include_router(recipes.router, prefix="/api", tags=["recipes"]) 
app.include_router(tasks.router, prefix="/api", tags=["tasks"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(data.router, prefix="/api", tags=["data"])
app.include_router(actions.router, prefix="/api", tags=["actions"])
app.include_router(ocr.router, prefix="/api", tags=["ocr"])
app.include_router(web_recipes.router, prefix="/api/web-recipes", tags=["web-recipes"])
app.include_router(ai_assistant.router, prefix="/api/ai-assistant", tags=["ai-assistant"])

# Health check endpoint (must be before static files)
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ChefCode Backend"}

# Check if frontend directory exists (for production deployment)
frontend_path = Path(__file__).parent.parent / "frontend" / "mobile" / "assets"
if frontend_path.exists():
    # Mount static files for production
    app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")
    
    # Serve index.html for root and catch-all routes
    @app.get("/")
    async def serve_frontend():
        return FileResponse(str(frontend_path / "index.html"))
    
    # Catch-all route for frontend SPA routing (must be last)
    @app.get("/{full_path:path}")
    async def serve_frontend_routes(full_path: str):
        # If it's an API call that doesn't exist, return 404
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # Check if file exists in static directory
        file_path = frontend_path / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        
        # For all other routes, serve index.html (SPA routing)
        return FileResponse(str(frontend_path / "index.html"))
else:
    # Fallback for development when frontend is not in expected location
    @app.get("/")
    async def root():
        return {"message": "ChefCode FastAPI Backend", "version": "1.0.0", "docs": "/docs"}

if __name__ == "__main__":
    # Use reload=True only in development
    # For production, use: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
    is_dev = os.getenv("ENVIRONMENT", "development") == "development"
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=is_dev)
