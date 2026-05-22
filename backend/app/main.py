from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, migrate
from app.routers import search, briefings, history, settings, filter as filter_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    migrate()
    yield

app = FastAPI(
    title="MathLiteratureHub API",
    description="数学动力系统文献智能搜索与总结系统",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(briefings.router, prefix="/api/briefings", tags=["briefings"])
app.include_router(history.router, prefix="/api/history", tags=["history"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(filter_router.router, prefix="/api/filter", tags=["filter"])

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
