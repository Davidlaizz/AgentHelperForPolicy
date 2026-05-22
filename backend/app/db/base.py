from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.models import (  # noqa: E402,F401
    CaseSlot,
    ChatMessage,
    ChatSession,
    Citation,
    EligibilityRecord,
    HotQuestion,
    MemoryItem,
    PolicyAttachment,
    PolicyChunk,
    PolicyDocument,
    PolicyRelation,
    PolicyScope,
    PolicyVersion,
    ServiceCase,
    StandardAnswer,
    User,
)
