import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageSquare, Send, ArrowLeft, Plus, Clock, User } from "lucide-react";
import { useForumPosts, useForumPost, useCreateForumPost, useCreateForumReply } from "../lib/hooks";

export const Route = createFileRoute("/forum")({
  component: ForumPage,
});

function ForumPage() {
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [showNewPostForm, setShowNewPostForm] = useState(false);

  if (selectedPostId !== null) {
    return <PostDetail postId={selectedPostId} onBack={() => setSelectedPostId(null)} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-[var(--lagoon)]" />
          <h1 className="text-3xl font-bold text-[var(--sea-ink)]">Student Forum</h1>
        </div>
        <button
          onClick={() => setShowNewPostForm(!showNewPostForm)}
          className="flex items-center gap-2 rounded-lg bg-[var(--lagoon)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--lagoon-deep)]"
        >
          <Plus className="h-4 w-4" />
          New Post
        </button>
      </div>

      {showNewPostForm && (
        <NewPostForm onCreated={() => setShowNewPostForm(false)} />
      )}

      <PostList onSelectPost={setSelectedPostId} />
    </div>
  );
}

/* ── Post List ──────────────────────────────────────────────────────── */

function PostList({ onSelectPost }: { onSelectPost: (id: number) => void }) {
  const { data: posts, isLoading, error } = useForumPosts();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorBox message="Failed to load forum posts" />;
  if (!posts?.length) return <EmptyState message="No posts yet — be the first to start a discussion!" />;

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <button
          key={post.id}
          onClick={() => onSelectPost(post.id)}
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-5 text-left shadow-sm transition hover:shadow-md hover:border-[var(--lagoon)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-semibold text-[var(--sea-ink)]">{post.title}</h3>
              <p className="line-clamp-2 text-sm text-[var(--sea-ink-soft)]">{post.body}</p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-[rgba(79,184,178,0.12)] px-3 py-1 text-xs font-medium text-[var(--lagoon-deep)]">
              <MessageSquare className="h-3 w-3" />
              {post.reply_count}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-[var(--sea-ink-soft)]">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.author_name || "Unknown"}</span>
            {post.course_name && <span className="rounded border border-[var(--line)] bg-[var(--island-bg)] px-2 py-0.5">{post.course_name}</span>}
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(post.created_at).toLocaleDateString()}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── New Post Form ──────────────────────────────────────────────────── */

function NewPostForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const mutation = useCreateForumPost();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    mutation.mutate({ title: title.trim(), body: body.trim() }, {
      onSuccess: () => { setTitle(""); setBody(""); onCreated(); },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-5">
      <h3 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">Create a New Post</h3>
      <input
        type="text"
        placeholder="Post title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-3 w-full rounded-lg border border-[var(--line)] bg-[var(--island-bg)] px-4 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
        required
      />
      <textarea
        placeholder="What's on your mind?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        className="mb-3 w-full rounded-lg border border-[var(--line)] bg-[var(--island-bg)] px-4 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
        required
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCreated} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm text-[var(--sea-ink-soft)] hover:bg-[var(--island-bg)] hover:text-[var(--sea-ink)]">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="flex items-center gap-2 rounded-lg bg-[var(--lagoon)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--lagoon-deep)] disabled:opacity-50">
          <Send className="h-4 w-4" />
          {mutation.isPending ? "Posting..." : "Post"}
        </button>
      </div>
      {mutation.isError && <p className="mt-2 text-sm text-red-500">Failed to create post: {mutation.error.message}</p>}
    </form>
  );
}

/* ── Post Detail ────────────────────────────────────────────────────── */

function PostDetail({ postId, onBack }: { postId: number; onBack: () => void }) {
  const { data: post, isLoading, error } = useForumPost(postId);
  const [replyBody, setReplyBody] = useState("");
  const replyMutation = useCreateForumReply(postId);

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    replyMutation.mutate({ body: replyBody.trim() }, {
      onSuccess: () => setReplyBody(""),
    });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error || !post) return <ErrorBox message="Failed to load post" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--lagoon-deep)] hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Forum
      </button>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-[var(--sea-ink)]">{post.title}</h2>
        <div className="mt-2 flex items-center gap-4 text-xs text-[var(--sea-ink-soft)]">
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.author_name || "Unknown"}</span>
          {post.course_name && <span className="rounded border border-[var(--line)] bg-[var(--island-bg)] px-2 py-0.5">{post.course_name}</span>}
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(post.created_at).toLocaleString()}</span>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-[var(--sea-ink)]">{post.body}</p>
      </div>

      {/* Replies */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-[var(--sea-ink)]">
          Replies ({post.replies.length})
        </h3>
        {post.replies.length === 0 && (
          <p className="text-sm text-[var(--sea-ink-soft)]">No replies yet — be the first to respond!</p>
        )}
        {post.replies.map((r) => (
          <div key={r.id} className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-4">
            <p className="whitespace-pre-wrap text-sm text-[var(--sea-ink)]">{r.body}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-[var(--sea-ink-soft)]">
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{r.author_name || "Unknown"}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(r.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Reply Form */}
      <form onSubmit={handleReply} className="flex gap-3">
        <input
          type="text"
          placeholder="Write a reply..."
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--island-bg)] px-4 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
          required
        />
        <button
          type="submit"
          disabled={replyMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-[var(--lagoon)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--lagoon-deep)] disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Reply
        </button>
      </form>
      {replyMutation.isError && <p className="text-sm text-red-500">Failed to post reply.</p>}
    </div>
  );
}

/* ── Shared UI ──────────────────────────────────────────────────────── */

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--lagoon)] border-t-transparent" />
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
        {message}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--island-bg)] p-12 text-center text-[var(--sea-ink-soft)]">
      <MessageSquare className="mx-auto mb-3 h-10 w-10" />
      <p>{message}</p>
    </div>
  );
}
