from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from dataclasses import dataclass
from typing import Any

from yt_dlp import YoutubeDL
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)

from app.chroma.chroma_client import get_study_resources_collection


class YouTubeIngestError(Exception):
    pass


@dataclass
class VideoEntry:
    video_id: str
    title: str
    original_url: str


MAX_VIDEOS_PER_IMPORT = max(1, int(os.getenv("YOUTUBE_MAX_VIDEOS_PER_IMPORT", "10")))
MAX_CHUNKS_PER_VIDEO = max(1, int(os.getenv("YOUTUBE_MAX_CHUNKS_PER_VIDEO", "40")))
TRANSCRIPT_FETCH_TIMEOUT_SECONDS = max(10, int(os.getenv("YOUTUBE_TRANSCRIPT_TIMEOUT_SECONDS", "120")))


def parse_youtube_url(url: str) -> list[VideoEntry]:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": True,
    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as exc:
        raise YouTubeIngestError(f"Failed to parse YouTube URL: {exc}") from exc

    if not info:
        raise YouTubeIngestError("Could not extract YouTube metadata")

    if info.get("_type") == "playlist":
        entries: list[VideoEntry] = []
        for item in info.get("entries") or []:
            if not item:
                continue
            video_id = item.get("id")
            if not video_id:
                continue
            entries.append(
                VideoEntry(
                    video_id=str(video_id),
                    title=str(item.get("title") or f"YouTube Video {video_id}"),
                    original_url=f"https://www.youtube.com/watch?v={video_id}",
                )
            )
        if not entries:
            raise YouTubeIngestError("Playlist does not contain playable videos")
        return entries[:MAX_VIDEOS_PER_IMPORT]

    video_id = info.get("id")
    if not video_id:
        raise YouTubeIngestError("Could not extract a valid YouTube video ID")

    return [
        VideoEntry(
            video_id=str(video_id),
            title=str(info.get("title") or f"YouTube Video {video_id}"),
            original_url=f"https://www.youtube.com/watch?v={video_id}",
        )
    ]


def _fetch_transcript_inner(video_id: str, languages: list[str] | None = None) -> list[dict[str, Any]]:
    preferred_languages = languages or ["en", "en-US", "en-GB"]

    try:
        ytt_api = YouTubeTranscriptApi()
        if hasattr(ytt_api, "list"):
            transcript_list = ytt_api.list(video_id)
        else:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
    except TranscriptsDisabled as exc:
        raise YouTubeIngestError(f"Transcripts are disabled for video {video_id}") from exc
    except VideoUnavailable as exc:
        raise YouTubeIngestError(f"Video {video_id} is unavailable or private") from exc
    except Exception as exc:
        raise YouTubeIngestError(f"Could not load transcripts for video {video_id}: {exc}") from exc

    try:
        transcript = transcript_list.find_manually_created_transcript(preferred_languages)
        fetched = transcript.fetch()
        return fetched.to_raw_data() if hasattr(fetched, "to_raw_data") else fetched
    except NoTranscriptFound:
        pass

    try:
        transcript = transcript_list.find_generated_transcript(preferred_languages)
        fetched = transcript.fetch()
        return fetched.to_raw_data() if hasattr(fetched, "to_raw_data") else fetched
    except NoTranscriptFound as exc:
        raise YouTubeIngestError(
            f"No manual or generated transcript available for video {video_id}"
        ) from exc
    except Exception as exc:
        raise YouTubeIngestError(
            f"Generated transcript could not be fetched for video {video_id}: {exc}"
        ) from exc


def fetch_transcript(video_id: str, languages: list[str] | None = None) -> list[dict[str, Any]]:
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_fetch_transcript_inner, video_id, languages)
        try:
            return future.result(timeout=TRANSCRIPT_FETCH_TIMEOUT_SECONDS)
        except FutureTimeoutError as exc:
            raise YouTubeIngestError(
                f"Transcript fetch timed out for video {video_id} after {TRANSCRIPT_FETCH_TIMEOUT_SECONDS}s"
            ) from exc


def chunk_transcript(
    transcript: list[dict[str, Any]],
    target_words: int = 180,
    min_words: int = 140,
    max_words: int = 240,
    max_span_seconds: int = 180,
) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []

    buffer_text: list[str] = []
    buffer_words = 0
    chunk_start: float | None = None
    chunk_end: float | None = None

    def flush_chunk() -> None:
        nonlocal buffer_text, buffer_words, chunk_start, chunk_end
        if not buffer_text or chunk_start is None:
            return
        text = " ".join(buffer_text).strip()
        if not text:
            return
        chunks.append(
            {
                "text": text,
                "start_time": int(chunk_start),
                "end_time": int(chunk_end or chunk_start),
                "word_count": buffer_words,
            }
        )
        buffer_text = []
        buffer_words = 0
        chunk_start = None
        chunk_end = None

    for segment in transcript:
        text = str(segment.get("text") or "").strip()
        if not text:
            continue

        start = float(segment.get("start") or 0.0)
        duration = float(segment.get("duration") or 0.0)
        end = start + duration

        words = text.split()
        if not words:
            continue

        if chunk_start is None:
            chunk_start = start

        buffer_text.append(text)
        buffer_words += len(words)
        chunk_end = end

        span = int((chunk_end or chunk_start) - chunk_start)
        reached_target = buffer_words >= target_words
        reached_time = span >= max_span_seconds
        exceeded_max = buffer_words >= max_words

        if exceeded_max or (reached_target and (reached_time or buffer_words >= min_words)):
            flush_chunk()

    flush_chunk()
    return chunks[:MAX_CHUNKS_PER_VIDEO]


def upsert_to_chroma(
    video_id: str,
    original_url: str,
    title: str,
    chunks: list[dict[str, Any]],
    subject: str | None = None,
    resource_id: int | None = None,
) -> int:
    if not chunks:
        return 0

    collection = get_study_resources_collection()

    ids: list[str] = []
    documents: list[str] = []
    metadatas: list[dict[str, Any]] = []

    for index, chunk in enumerate(chunks):
        start_time = int(chunk["start_time"])
        timestamp_url = f"https://www.youtube.com/watch?v={video_id}&t={start_time}s"

        ids.append(f"yt_{video_id}_{index}")
        documents.append(chunk["text"])
        metadatas.append(
            {
                "source": "youtube",
                "source_type": "youtube",
                "resource_id": resource_id,
                "video_id": video_id,
                "timestamp": start_time,
                "url": timestamp_url,
                "timestamp_url": timestamp_url,
                "original_url": original_url,
                "title": title,
                "subject": subject or "YouTube",
            }
        )

    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
    return len(ids)


def ingest_youtube_url(
    url: str,
    subject: str | None = None,
    languages: list[str] | None = None,
) -> dict[str, Any]:
    videos = parse_youtube_url(url)

    processed: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    for video in videos:
        try:
            transcript = fetch_transcript(video.video_id, languages=languages)
            chunks = chunk_transcript(transcript)
            upserted = upsert_to_chroma(
                video_id=video.video_id,
                original_url=video.original_url,
                title=video.title,
                chunks=chunks,
                subject=subject,
            )
            processed.append(
                {
                    "video_id": video.video_id,
                    "title": video.title,
                    "chunks_indexed": upserted,
                    "url": video.original_url,
                }
            )
        except YouTubeIngestError as exc:
            errors.append({"video_id": video.video_id, "error": str(exc)})
        except Exception as exc:
            errors.append({"video_id": video.video_id, "error": f"Unexpected error: {exc}"})

    return {
        "requested_url": url,
        "total_videos": len(videos),
        "indexed_videos": len(processed),
        "failed_videos": len(errors),
        "processed": processed,
        "errors": errors,
    }


def ingest_youtube_video(
    video: VideoEntry,
    subject: str | None = None,
    languages: list[str] | None = None,
    resource_id: int | None = None,
) -> dict[str, Any]:
    transcript = fetch_transcript(video.video_id, languages=languages)
    chunks = chunk_transcript(transcript)
    upserted = upsert_to_chroma(
        video_id=video.video_id,
        original_url=video.original_url,
        title=video.title,
        chunks=chunks,
        subject=subject,
        resource_id=resource_id,
    )
    return {
        "video_id": video.video_id,
        "title": video.title,
        "chunks_indexed": upserted,
        "url": video.original_url,
    }
