from __future__ import annotations

import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from sqlalchemy import select

from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models import ChatMessage, ChatSession, User


def run_smoke_test() -> None:
    init_db()

    with SessionLocal() as session:
        demo_user = session.execute(
            select(User).where(User.display_name == "M2 Demo User")
        ).scalar_one_or_none()

        if demo_user is None:
            demo_user = User(role="student", display_name="M2 Demo User")
            session.add(demo_user)
            session.flush()

        demo_session = ChatSession(
            user_id=demo_user.id,
            title="M2 会话验证",
        )
        session.add(demo_session)
        session.flush()

        demo_message = ChatMessage(
            session_id=demo_session.id,
            role="user",
            content="我想验证 M2 的会话与消息表是否可用。",
            extra_metadata={"source": "m2_smoke_test"},
        )
        session.add(demo_message)
        session.commit()

        print(
            {
                "user_id": str(demo_user.id),
                "session_id": str(demo_session.id),
                "message_id": str(demo_message.id),
            }
        )


if __name__ == "__main__":
    run_smoke_test()
