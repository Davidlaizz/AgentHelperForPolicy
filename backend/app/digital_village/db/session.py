from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.digital_village.config import dv_settings


engine = create_engine(
    dv_settings.sqlalchemy_database_uri,
    future=True,
    pool_pre_ping=True,
)

DigitalVillageSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)
