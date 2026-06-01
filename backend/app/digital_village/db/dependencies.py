from collections.abc import Generator

from sqlalchemy.orm import Session

from app.digital_village.db.session import DigitalVillageSessionLocal


def get_digital_village_db() -> Generator[Session, None, None]:
    db = DigitalVillageSessionLocal()
    try:
        yield db
    finally:
        db.close()
