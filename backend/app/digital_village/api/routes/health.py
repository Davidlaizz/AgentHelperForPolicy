from fastapi import APIRouter

from app.digital_village.db.session import engine

router = APIRouter(tags=["digital-village-health"])


@router.get("/health")
def digital_village_health() -> dict[str, str]:
    database_status = "connected"

    try:
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
    except Exception:
        database_status = "disconnected"

    return {
        "status": "ok",
        "service": "zhicetong-digital-village",
        "database": database_status,
    }
