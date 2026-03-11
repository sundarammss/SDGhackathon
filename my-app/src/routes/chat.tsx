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
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-3xl font-bold text-[var(--sea-ink)]">
          Chat
        </h1>
      </div>

      {/* Incoming Requests Banner */}
      <IncomingRequestsBanner />

      <div className="flex gap-4 h-[600px]">
        {/* Sidebar */}
        <ConversationList
          activeConvId={activeConvId}
          onSelect={setActiveConvId}
        />

        {/* Chat Window */}
        <div className="flex-1 flex flex-col rounded-xl border border-[var(--line)] bg-[var(--island-bg)] overflow-hidden">
          {activeConvId ? (
            <ChatWindow convId={activeConvId} currentUserId={user.id} onBack={() => setActiveConvId(null)} />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-[var(--sea-ink-soft)] gap-3">
              <MessageSquare className="h-16 w-16 opacity-30" />
              <p className="text-sm">Select a conversation to start chatting</p>
              <p className="text-xs text-center max-w-xs">
                Connect with peers from the{" "}
                <a href="/peers" className="text-indigo-600 dark:text-indigo-400 hover:underline">
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
    <div className="w-64 flex-shrink-0 flex flex-col rounded-xl border border-[var(--line)] bg-[var(--island-bg)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--line)]">
        <h2 className="text-sm font-semibold text-[var(--sea-ink)]">
          Conversations
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-4 text-xs text-center text-[var(--sea-ink-soft)]">Loading...</div>
        )}
        {!isLoading && !convs?.length && (
          <div className="p-6 text-center text-xs text-[var(--sea-ink-soft)] space-y-1">
            <MessageSquare className="mx-auto h-8 w-8 opacity-30 mb-2" />
            <p>No conversations yet.</p>
            <p>Accept a peer request to start chatting!</p>
          </div>
        )}
        {convs?.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left px-4 py-3 border-b border-[var(--line)] hover:bg-[var(--island-bg)] transition-colors ${
              activeConvId === conv.id
                ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-l-indigo-600"
                : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300">
                {conv.other_student_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-[var(--sea-ink)] truncate">
                    {conv.other_student_name}
                  </p>
                  {conv.is_blocked && (
                    <span title="Blocked">
                      <Shield className="h-3 w-3 text-red-400 flex-shrink-0" />
                    </span>
                  )}
                </div>
                {conv.last_message && (
                  <p className="text-xs text-[var(--sea-ink-soft)] truncate">
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--line)] bg-[var(--island-bg)]">
        <button
          onClick={onBack}
          className="sm:hidden text-[var(--sea-ink-soft)] hover:text-indigo-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
          {conv?.other_student_name.charAt(0).toUpperCase() ?? "?"}
        </div>
        <div>
          <p className="font-semibold text-[var(--sea-ink)] text-sm">
            {conv?.other_student_name ?? "Chat"}
          </p>
          <p className="text-xs text-green-500 flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
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
            className={`ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              conv.blocked_by_me
                ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                : "bg-[var(--island-bg)] text-[var(--sea-ink-soft)] hover:bg-[var(--island-bg)] border border-[var(--line)]"
            }`}
          >
            {conv.blocked_by_me ? (
              <><ShieldOff className="h-3.5 w-3.5" /> Unblock</>
            ) : (
              <><Shield className="h-3.5 w-3.5" /> Block</>
            )}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        )}
        {!isLoading && !messages?.length && (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--sea-ink-soft)] gap-2">
            <MessageSquare className="h-10 w-10 opacity-30" />
            <p className="text-sm">No messages yet. Say hello! 👋</p>
          </div>
        )}
        {messages?.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
                  isMine
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-[var(--island-bg)] text-[var(--sea-ink)] rounded-bl-sm"
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.body}</p>
                <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                  <span className={`text-[10px] ${isMine ? "text-indigo-200" : "text-[var(--sea-ink-soft)]"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isMine && <CheckCheck className="h-3 w-3 text-indigo-200" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--line)] bg-[var(--island-bg)]">
        {conv?.is_blocked ? (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-[var(--sea-ink-soft)] rounded-lg border border-dashed border-[var(--line)] bg-[var(--island-bg)]">
            <Shield className="h-4 w-4 text-red-400" />
            {conv.blocked_by_me
              ? "You have blocked this user. Unblock to resume chatting."
              : "You cannot send messages to this user."}
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send)"
              className="flex-1 resize-none rounded-xl border border-[var(--line)] bg-[var(--island-bg)] text-[var(--sea-ink)] px-4 py-2.5 text-sm placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sendMutation.isPending}
              className="flex-shrink-0 rounded-xl bg-indigo-600 p-2.5 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sendMutation.isPending ? (
                <Clock className="h-5 w-5 animate-pulse" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        )}
        {sendMutation.isError && (
          <p className="mt-1 text-xs text-red-500">Failed to send message.</p>
        )}
      </div>
    </>
  );
}
