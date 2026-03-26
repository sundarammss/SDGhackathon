from __future__ import annotations

from pathlib import Path

import chromadb
from chromadb.api.models.Collection import Collection
from chromadb.utils.embedding_functions import (
    DefaultEmbeddingFunction,
    SentenceTransformerEmbeddingFunction,
)

CHROMA_DIR = Path(__file__).resolve().parent.parent.parent / "chroma_data"
CHROMA_DIR.mkdir(parents=True, exist_ok=True)

_client = None
_embedding_function = None

def _get_client_and_ef():
    global _client, _embedding_function
    if _client is None:
        _client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        try:
            _embedding_function = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
        except Exception:
            _embedding_function = DefaultEmbeddingFunction()
    return _client, _embedding_function


def get_study_resources_collection() -> Collection:
    c, ef = _get_client_and_ef()
    return c.get_or_create_collection(
        name="study_resources",
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},
    )
