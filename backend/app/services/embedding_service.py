from __future__ import annotations

from typing import Any

from app.chroma.chroma_client import get_study_resources_collection


def index_study_resource(resource_id: int, document: str, metadata: dict[str, Any]) -> None:
    collection = get_study_resources_collection()
    collection.upsert(
        ids=[str(resource_id)],
        documents=[document],
        metadatas=[metadata],
    )


def remove_study_resource(resource_id: int) -> None:
    collection = get_study_resources_collection()
    collection.delete(ids=[str(resource_id)])


def semantic_search_resources(
    query: str,
    top_k: int = 8,
    subject: str | None = None,
) -> list[dict[str, Any]]:
    collection = get_study_resources_collection()
    where = {"subject": subject} if subject else None

    results = collection.query(
        query_texts=[query],
        n_results=top_k,
        where=where,
        include=["metadatas", "distances", "documents"],
    )

    ids = results.get("ids", [[]])
    metadatas = results.get("metadatas", [[]])
    distances = results.get("distances", [[]])
    documents = results.get("documents", [[]])
    if not metadatas:
        return []

    items: list[dict[str, Any]] = []
    for idx, (md, dist) in enumerate(zip(metadatas[0], distances[0] if distances else [])):
        if not md:
            continue
        items.append(
            {
                "id": (ids[0][idx] if ids and ids[0] and idx < len(ids[0]) else None),
                "metadata": md,
                "document": (documents[0][idx] if documents and documents[0] and idx < len(documents[0]) else None),
                "similarity_score": round(max(0.0, 1.0 - float(dist)), 4),
            }
        )
    return items
