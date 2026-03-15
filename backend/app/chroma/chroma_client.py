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

client = chromadb.PersistentClient(path=str(CHROMA_DIR))

try:
    embedding_function = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
except Exception:
    embedding_function = DefaultEmbeddingFunction()


def get_study_resources_collection() -> Collection:
    return client.get_or_create_collection(
        name="study_resources",
        embedding_function=embedding_function,
        metadata={"hnsw:space": "cosine"},
    )
