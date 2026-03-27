import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Users,
  CheckCheck,
  Clock,
  Shield,
  ShieldOff,
} from "lucide-react";
import { useAuthStore } from "../lib/auth";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useIncomingRequests,
  useAcceptPeerRequest,
  useRejectPeerRequest,
  useBlockPeer,
  useUnblockPeer,
} from "../lib/hooks";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);

  if (!user || user.role !== "student") {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-[var(--sea-ink-soft)]">
          Chat is available for students only.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-indigo-100/80 p-2.5 shadow-inner dark:bg-indigo-900/40">
          <MessageSquare className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-[var(--sea-ink)]">
          Messages
        </h1>
      </div>

      {/* Incoming Requests Banner */}
      <IncomingRequestsBanner />

      <div className="flex min-h-0 flex-1 gap-6">
        {/* Sidebar */}
        <ConversationList
          activeConvId={activeConvId}
          onSelect={setActiveConvId}
        />

        {/* Chat Window */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow flex flex-1 flex-col overflow-hidden rounded-2xl shadow-xl">
          {activeConvId ? (
            <ChatWindow convId={activeConvId} currentUserId={user.id} onBack={() => setActiveConvId(null)} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-[var(--sea-ink-soft)] bg-gradient-to-br from-[var(--island-bg)] to-[var(--bg-base)]">
              <div className="rounded-full bg-white/40 p-6 shadow-sm dark:bg-white/5">
                <MessageSquare className="h-12 w-12 opacity-40 text-indigo-500" />
              </div>
              <p className="font-medium">Select a conversation to start chatting</p>
              <p className="max-w-xs text-center text-sm">
                Connect with peers from the{" "}
                <a href="/peers" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                  Peer Matching
                </a>{" "}
                page to start conversations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Incoming Requests Banner ────────────────────────────────────── */

function IncomingRequestsBanner() {
  const { data: requests } = useIncomingRequests();
  const acceptMutation = useAcceptPeerRequest();
  const rejectMutation = useRejectPeerRequest();

  if (!requests?.length) return null;

  return (
    <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/30">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">
          Peer Requests ({requests.length})
        </h3>
      </div>
      <div className="space-y-2">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex items-center justify-between rounded-lg bg-[var(--island-bg)] px-3 py-2 border border-indigo-100 dark:border-indigo-900"
          >
              <span className="text-sm font-medium text-[var(--sea-ink)]">
              {req.from_student_name} wants to connect
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => acceptMutation.mutate(req.id)}
                disabled={acceptMutation.isPending}
                className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => rejectMutation.mutate(req.id)}
                disabled={rejectMutation.isPending}
                className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs font-medium text-[var(--sea-ink-soft)] hover:bg-[var(--island-bg)] disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Conversation List ───────────────────────────────────────────── */

function ConversationList({
  activeConvId,
  onSelect,
}: {
  activeConvId: number | null;
  onSelect: (id: number) => void;
}) {
  const { data: convs, isLoading } = useConversations();

  return (
    <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow flex w-72 flex-shrink-0 flex-col overflow-hidden rounded-2xl shadow-lg">
      <div className="border-b border-[var(--line)] bg-white/30 px-5 py-4 dark:bg-white/5">
        <h2 className="font-bold text-[var(--sea-ink)] tracking-wider uppercase text-xs">
          Conversations
        </h2>
      </div>
      <div className="scrollbar-thin scrollbar-thumb-[var(--line)] flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-4 text-center text-sm text-[var(--sea-ink-soft)]">Loading...</div>
        )}
        {!isLoading && !convs?.length && (
          <div className="flex flex-col items-center justify-center space-y-2 p-8 text-center text-sm text-[var(--sea-ink-soft)]">
            <MessageSquare className="h-10 w-10 opacity-20 mb-1" />
            <p className="font-medium">No conversations yet.</p>
            <p className="text-xs opacity-80">Accept a peer request to start chatting!</p>
          </div>
        )}
        {convs?.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full border-b border-[var(--line)] px-5 py-3.5 text-left transition-all duration-200 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 ${
              activeConvId === conv.id
                ? "bg-indigo-50/80 shadow-[inset_3px_0_0_0_rgba(79,70,229,1)] dark:bg-indigo-900/30"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 text-sm font-bold text-indigo-700 shadow-sm dark:from-indigo-900 dark:to-indigo-800 dark:text-indigo-200">
                {conv.other_student_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-sm font-bold text-[var(--sea-ink)]">
                    {conv.other_student_name}
                  </p>
                  {conv.is_blocked && (
                    <span title="Blocked">
                      <Shield className="h-3 w-3 flex-shrink-0 text-red-500" />
                    </span>
                  )}
                </div>
                {conv.last_message && (
                  <p className="truncate text-xs text-[var(--sea-ink-soft)] mt-0.5">
                    {conv.last_message}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Chat Window ─────────────────────────────────────────────────── */

function ChatWindow({
  convId,
  currentUserId,
  onBack,
}: {
  convId: number;
  currentUserId: number;
  onBack: () => void;
}) {
  const { data: convs } = useConversations();
  const conv = convs?.find((c) => c.id === convId);
  const { data: messages, isLoading } = useMessages(convId);
  const sendMutation = useSendMessage(convId);
  const blockMutation = useBlockPeer();
  const unblockMutation = useUnblockPeer();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed, {
      onSuccess: () => setInput(""),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--line)] bg-white/40 px-6 py-4 backdrop-blur-md dark:bg-white/5">
        <button
          onClick={onBack}
          className="sm:hidden text-[var(--sea-ink-soft)] hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 text-sm font-bold text-indigo-700 shadow-sm dark:from-indigo-900 dark:to-indigo-800 dark:text-indigo-200">
          {conv?.other_student_name.charAt(0).toUpperCase() ?? "?"}
        </div>
        <div>
          <p className="text-base font-bold text-[var(--sea-ink)] tracking-tight">
            {conv?.other_student_name ?? "Chat"}
          </p>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-500">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            Peer Partner
          </p>
        </div>
        {/* Block / Unblock button */}
        {conv && (
          <button
            onClick={() =>
              conv.blocked_by_me
                ? unblockMutation.mutate(conv.other_student_id)
                : blockMutation.mutate(conv.other_student_id)
            }
            disabled={blockMutation.isPending || unblockMutation.isPending}
            title={conv.blocked_by_me ? "Unblock this user" : "Block this user"}
            className={`ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
              conv.blocked_by_me
                ? "bg-red-100 text-red-600 hover:bg-red-200 shadow-sm dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60"
                : "border border-[var(--line)] bg-white/50 text-[var(--sea-ink-soft)] hover:bg-white/80 shadow-sm dark:bg-white/5 dark:hover:bg-white/10"
            }`}
          >
            {conv.blocked_by_me ? (
              <><ShieldOff className="h-4 w-4" /> Unblock</>
            ) : (
              <><Shield className="h-4 w-4" /> Block</>
            )}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="scrollbar-thin scrollbar-thumb-[var(--line)] flex-1 overflow-y-auto bg-gradient-to-b from-[var(--island-bg)] to-[var(--bg-base)] p-6 space-y-4">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        )}
        {!isLoading && !messages?.length && (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--sea-ink-soft)] gap-3">
            <div className="rounded-full bg-white/50 p-6 shadow-sm dark:bg-white/5">
              <MessageSquare className="h-12 w-12 opacity-30 text-indigo-500" />
            </div>
            <p className="font-semibold text-base">No messages yet. Say hello! 👋</p>
          </div>
        )}
        {messages?.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex opacity-0 rise-in ${isMine ? "justify-end" : "justify-start"}`}
              style={{ animationDuration: "400ms", animationFillMode: "forwards" }}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${
                  isMine
                    ? "rounded-br-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-indigo-500/20"
                    : "rounded-bl-sm border border-[var(--line)] bg-white/80 text-[var(--sea-ink)] backdrop-blur-sm dark:bg-[rgba(24,36,41,0.85)]"
                }`}
              >
                <p className="text-[15px] leading-relaxed tracking-tight">{msg.body}</p>
                <div className={`mt-1.5 flex items-center gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold ${isMine ? "text-indigo-200" : "text-[var(--sea-ink-soft)]"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isMine && <CheckCheck className="h-3.5 w-3.5 text-indigo-300" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--line)] bg-white/40 p-4 backdrop-blur-lg dark:bg-white/5">
        {conv?.is_blocked ? (
          <div className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-red-500 border border-dashed border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20">
            <Shield className="h-5 w-5" />
            {conv.blocked_by_me
              ? "You have blocked this user. Unblock to resume chatting."
              : "You cannot send messages to this user."}
          </div>
        ) : (
          <div className="flex items-end gap-3 rounded-2xl border border-[var(--line)] bg-[var(--island-bg)] p-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/50">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send)"
              className="scrollbar-thin scrollbar-thumb-[var(--line)] min-h-[44px] max-h-32 flex-1 resize-none bg-transparent px-4 py-3 text-[15px] text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sendMutation.isPending}
              className="mb-1 mr-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20 transition-all hover:scale-105 hover:from-indigo-600 hover:to-indigo-700 disabled:pointer-events-none disabled:opacity-40"
            >
              {sendMutation.isPending ? (
                <Clock className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5 ml-0.5" />
              )}
            </button>
          </div>
        )}
        {sendMutation.isError && (
          <p className="mt-2 text-center text-xs font-semibold text-red-500">Failed to send message.</p>
        )}
      </div>
    </>
  );
}
