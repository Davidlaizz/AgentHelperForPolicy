from sqlalchemy import text

from app.db.session import engine


def init_db() -> None:
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        connection.execute(text("SELECT 1"))


if __name__ == "__main__":
    init_db()
    print("Database initialization finished.")

