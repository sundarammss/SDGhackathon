from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import ForumPost, ForumReply, Student
from ..schemas import ForumPostCreate, ForumPostOut, ForumPostDetail, ForumReplyCreate, ForumReplyOut
from ..rbac import require_role

router = APIRouter(prefix="/api/v1/forum", tags=["forum"])


@router.get("/posts", response_model=list[ForumPostOut])
async def list_posts(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(ForumPost)
        .options(selectinload(ForumPost.author), selectinload(ForumPost.course), selectinload(ForumPost.replies))
        .order_by(ForumPost.created_at.desc())
    )
    result = await db.execute(stmt)
    posts = result.scalars().all()
    return [
        ForumPostOut(
            id=p.id,
            author_id=p.author_id,
            author_name=f"{p.author.first_name} {p.author.last_name}" if p.author else None,
            title=p.title,
            body=p.body,
            course_id=p.course_id,
            course_name=p.course.title if p.course else None,
            reply_count=len(p.replies),
            created_at=p.created_at,
        )
        for p in posts
    ]


@router.get("/posts/{post_id}", response_model=ForumPostDetail)
async def get_post(post_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(ForumPost)
        .where(ForumPost.id == post_id)
        .options(
            selectinload(ForumPost.author),
            selectinload(ForumPost.course),
            selectinload(ForumPost.replies).selectinload(ForumReply.author),
        )
    )
    result = await db.execute(stmt)
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "Post not found")
    return ForumPostDetail(
        id=post.id,
        author_id=post.author_id,
        author_name=f"{post.author.first_name} {post.author.last_name}" if post.author else None,
        title=post.title,
        body=post.body,
        course_id=post.course_id,
        course_name=post.course.title if post.course else None,
        reply_count=len(post.replies),
        created_at=post.created_at,
        replies=[
            ForumReplyOut(
                id=r.id,
                post_id=r.post_id,
                author_id=r.author_id,
                author_name=f"{r.author.first_name} {r.author.last_name}" if r.author else None,
                body=r.body,
                created_at=r.created_at,
            )
            for r in post.replies
        ],
    )


@router.post("/posts", response_model=ForumPostOut, status_code=201)
async def create_post(
    payload: ForumPostCreate,
    user: dict = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    author = await db.get(Student, user["id"])
    if not author:
        raise HTTPException(404, "User not found")
    post = ForumPost(author_id=user["id"], title=payload.title, body=payload.body, course_id=payload.course_id)
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return ForumPostOut(
        id=post.id,
        author_id=post.author_id,
        author_name=f"{author.first_name} {author.last_name}",
        title=post.title,
        body=post.body,
        course_id=post.course_id,
        reply_count=0,
        created_at=post.created_at,
    )


@router.post("/posts/{post_id}/replies", response_model=ForumReplyOut, status_code=201)
async def create_reply(
    post_id: int,
    payload: ForumReplyCreate,
    user: dict = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    post = await db.get(ForumPost, post_id)
    if not post:
        raise HTTPException(404, "Post not found")
    author = await db.get(Student, user["id"])
    reply = ForumReply(post_id=post_id, author_id=user["id"], body=payload.body)
    db.add(reply)
    await db.commit()
    await db.refresh(reply)
    return ForumReplyOut(
        id=reply.id,
        post_id=reply.post_id,
        author_id=reply.author_id,
        author_name=f"{author.first_name} {author.last_name}" if author else None,
        body=reply.body,
        created_at=reply.created_at,
    )
