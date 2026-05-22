from fastapi import APIRouter

from app.db.session import engine

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    database_status = "connected"

    try:
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
    except Exception:
        database_status = "disconnected"

    return {
        "status": "ok",
        "service": "zhicetong-api",
        "database": database_status,
    }

