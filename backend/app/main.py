from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.chat import router as chat_router
from app.api.routes.documents import router as documents_router
from app.api.routes.health import router as health_router
from app.api.routes.management import router as management_router
from app.api.routes.rag import router as rag_router
from app.core.config import settings
from app.db.init_db import init_db
from app.digital_village.api.routes.documents import router as dv_documents_router
from app.digital_village.api.routes.health import router as dv_health_router
from app.digital_village.api.routes.rag import router as dv_rag_router
from app.digital_village.db.init_db import init_digital_village_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_digital_village_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3001",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(rag_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(management_router, prefix="/api")

# 数字乡村场景路由
app.include_router(dv_health_router, prefix="/api/digital-village")
app.include_router(dv_documents_router, prefix="/api/digital-village")
app.include_router(dv_rag_router, prefix="/api/digital-village")


@app.get("/")
def root() -> dict[str, str]:
    return {"message": f"{settings.app_name} is running"}
