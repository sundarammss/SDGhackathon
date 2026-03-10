"""Password hashing and verification using PBKDF2-HMAC-SHA256 (stdlib only)."""

from __future__ import annotations

import hashlib
import secrets

_ITERATIONS = 260_000
_HASH_NAME = "sha256"
_SALT_BYTES = 32


def hash_password(password: str) -> str:
    """Hash *password* and return a storable ``'<salt_hex>:<dk_hex>'`` string."""
    salt = secrets.token_bytes(_SALT_BYTES)
    dk = hashlib.pbkdf2_hmac(_HASH_NAME, password.encode(), salt, _ITERATIONS)
    return f"{salt.hex()}:{dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    """Return ``True`` iff *password* matches the stored hash."""
    try:
        salt_hex, dk_hex = stored.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        dk = hashlib.pbkdf2_hmac(_HASH_NAME, password.encode(), salt, _ITERATIONS)
        return secrets.compare_digest(dk.hex(), dk_hex)
    except Exception:
        return False
