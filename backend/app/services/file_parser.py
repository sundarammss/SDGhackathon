from __future__ import annotations

from pathlib import Path

from docx import Document
from pypdf import PdfReader


def extract_text_from_file(file_path: str | Path) -> str:
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        reader = PdfReader(str(path))
        pages: list[str] = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        return "\n".join(pages).strip()

    if suffix == ".docx":
        doc = Document(str(path))
        return "\n".join(p.text for p in doc.paragraphs).strip()

    if suffix == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore").strip()

    raise ValueError(f"Unsupported file type: {suffix}")
