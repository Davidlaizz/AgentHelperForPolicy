from __future__ import annotations

from typing import Any

from sqlalchemy.types import UserDefinedType


class Vector(UserDefinedType):
    cache_ok = True

    def __init__(self, dimensions: int | None = None) -> None:
        self.dimensions = dimensions

    def get_col_spec(self, **_: Any) -> str:
        if self.dimensions is None:
            return "VECTOR"
        return f"VECTOR({self.dimensions})"

    def bind_processor(self, dialect: Any) -> Any:
        def process(value: Any) -> Any:
            if value is None:
                return None
            if isinstance(value, (list, tuple)):
                return "[" + ",".join(str(float(item)) for item in value) + "]"
            return value

        return process

    def result_processor(self, dialect: Any, coltype: Any) -> Any:
        def process(value: Any) -> Any:
            if value is None:
                return None
            if isinstance(value, str) and value.startswith("[") and value.endswith("]"):
                inner = value[1:-1].strip()
                if not inner:
                    return []
                return [float(item) for item in inner.split(",")]
            return value

        return process
