"""Lightweight Role-Based Access Control middleware.

For this first iteration the caller passes a role via the X-User-Role header.
In production this would be extracted from a verified JWT.
"""

from __future__ import annotations

from fastapi import Header, HTTPException, status


ROLE_HIERARCHY: dict[str, int] = {
    "student": 1,
    "advisor": 2,
    "admin": 3,
}


def require_role(minimum_role: str):
    """FastAPI dependency that enforces a minimum role level."""

    minimum_level = ROLE_HIERARCHY.get(minimum_role, 0)

    async def _check(
        x_user_role: str = Header(default="student"),
        x_user_id: str = Header(default="0"),
    ):
        caller_level = ROLE_HIERARCHY.get(x_user_role.lower(), 0)
        if caller_level < minimum_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{x_user_role}' lacks permission. Minimum required: '{minimum_role}'.",
            )
        return {"role": x_user_role.lower(), "id": int(x_user_id)}

    return _check
