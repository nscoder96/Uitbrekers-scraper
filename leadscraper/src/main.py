import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router
from .services.lead_store import LeadStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup resources."""
    # Initialize database
    lead_store = LeadStore()
    await lead_store.init_db()
    app.state.lead_store = lead_store
    yield
    # Cleanup (if needed)


app = FastAPI(
    title="Uitbrekers.nl Lead Scraper",
    description="API voor het scrapen van hoveniersbedrijven en genereren van pitches",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuratie voor frontend
# In productie: voeg je Vercel URL toe
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

# Voeg productie frontend URL toe indien aanwezig
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Uitbrekers.nl Lead Scraper API"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
