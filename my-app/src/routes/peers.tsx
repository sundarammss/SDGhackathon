import { createFileRoute } from "@tanstack/react-router";
import { usePeerMatches, useSendPeerRequest, useOutgoingRequests, usePeerConnections } from "../lib/hooks";
import { useAuthStore } from "../lib/auth";
import { useState } from "react";
import { UserPlus, Check, Users, Link2 } from "lucide-react";
import type { PeerMatch } from "../lib/api";

export const Route = createFileRoute("/peers")({
  component: PeersPage,
});

/* ------------------------------------------------------------------ */
/*  Strength badge colour                                             */
/* ------------------------------------------------------------------ */
const strengthColours: Record<string, string> = {
  "quantitative-reasoning": "border border-[var(--chip-line)] bg-[var(--chip-bg)] text-[var(--sea-ink)]",
  writing: "border border-[var(--chip-line)] bg-primary-fixed text-on-primary-fixed",
  "time-management": "border border-[rgba(0,150,104,0.24)] bg-[rgba(0,150,104,0.12)] text-[var(--lagoon-deep)]",
  "critical-thinking": "border border-[rgba(143,71,0,0.24)] bg-[rgba(255,183,132,0.28)] text-[var(--color-tertiary)]",
  "lab-skills": "border border-outline-variant bg-surface-container text-on-surface",
  presentation: "border border-[var(--chip-line)] bg-secondary-container text-on-secondary-fixed",
  coding: "border border-[rgba(0,150,104,0.24)] bg-[rgba(0,150,104,0.12)] text-[var(--lagoon-deep)]",
  "research-methodology": "border border-[var(--chip-line)] bg-primary-fixed text-on-primary-fixed",
};

function badgeClass(strength: string) {
  return strengthColours[strength] ?? "border border-[var(--chip-line)] bg-[var(--chip-bg)] text-[var(--sea-ink)]";
}

/* ------------------------------------------------------------------ */
/*  Compatibility bar                                                 */
/* ------------------------------------------------------------------ */
function CompatibilityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const colour =
    pct >= 80
      ? "bg-[var(--lagoon)]"
      : pct >= 60
        ? "bg-[var(--color-tertiary-fixed-dim)]"
        : "bg-error";

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-3 rounded-full bg-[var(--progress-track)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold tabular-nums w-12 text-right">
        {pct}%
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Peer card                                                         */
/* ------------------------------------------------------------------ */
function PeerCard({
  match,
  rank,
  sentIds,
  onConnect,
}: {
  match: PeerMatch;
  rank: number;
  sentIds: Set<number>;
  onConnect: (peerId: number) => void;
}) {
  const alreadySent = sentIds.has(match.peer_id);

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-full border border-outline-variant bg-primary-fixed text-on-primary-fixed font-bold text-sm">
            #{rank}
          </span>
          <div>
            <h3 className="font-semibold text-[var(--sea-ink)]">
              {match.peer_name}
            </h3>
            <p className="text-xs text-[var(--sea-ink-soft)]">
              Student ID: {match.peer_id}
            </p>
          </div>
        </div>
        <button
          onClick={() => onConnect(match.peer_id)}
          disabled={alreadySent}
          title={alreadySent ? "Request sent" : "Send connection request"}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            alreadySent
              ? "cursor-default border border-[rgba(0,150,104,0.26)] bg-[rgba(0,150,104,0.12)] text-[var(--lagoon-deep)]"
              : "bg-primary text-on-primary hover:bg-primary-container"
          }`}
        >
          {alreadySent ? (
            <>
              <Check className="h-3.5 w-3.5" /> Sent
            </>
          ) : (
            <>
              <UserPlus className="h-3.5 w-3.5" /> Connect
            </>
          )}
        </button>
      </div>

      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider text-[var(--sea-ink-soft)] mb-1">
          Compatibility
        </p>
        <CompatibilityBar score={match.compatibility_score} />
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--sea-ink-soft)] mb-2">
          Complementary Strengths
        </p>
        <div className="flex flex-wrap gap-2">
          {match.complementary_strengths.map((s) => (
            <span
              key={s}
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass(s)}`}
            >
              {s.replace(/-/g, " ")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
function PeersPage() {
  const user = useAuthStore((s) => s.user);
  const isStudent = user?.role === "student";

  if (!isStudent) {
    return <TeacherConnectionsView />;
  }

  return <StudentPeerMatchView />;
}

/* ------------------------------------------------------------------ */
/*  Teacher / Admin: connections overview                             */
/* ------------------------------------------------------------------ */
function TeacherConnectionsView() {
  const { data: connections, isLoading } = usePeerConnections();
  const [search, setSearch] = useState("");

  const filtered = (connections ?? []).filter((c) => {
    const q = search.toLowerCase();
    return (
      c.student_a_name.toLowerCase().includes(q) ||
      c.student_b_name.toLowerCase().includes(q) ||
      (c.student_a_department ?? "").toLowerCase().includes(q) ||
      (c.student_b_department ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <Link2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-3xl font-bold text-[var(--sea-ink)]">
          Peer Connections
        </h1>
      </div>
      <p className="text-[var(--sea-ink-soft)] mb-6">
        Students who have accepted each other's peer requests and are now connected.
      </p>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-[var(--island-bg)] px-4 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {!isLoading && !filtered.length && (
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--island-bg)] p-12 text-center text-[var(--sea-ink-soft)]">
          <Users className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>{search ? "No connections match your search." : "No peer connections yet."}</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[var(--line)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--island-bg)]">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--sea-ink-soft)]">Student A</th>
                <th className="px-4 py-3 font-medium text-[var(--sea-ink-soft)]">Student B</th>
                <th className="px-4 py-3 font-medium text-[var(--sea-ink-soft)]">Connected On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {filtered.map((c) => (
                <tr key={c.request_id} className="hover:bg-[var(--island-bg)] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--sea-ink)]">{c.student_a_name}</p>
                    {c.student_a_department && (
                      <p className="text-xs text-[var(--sea-ink-soft)]">{c.student_a_department}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--sea-ink)]">{c.student_b_name}</p>
                    {c.student_b_department && (
                      <p className="text-xs text-[var(--sea-ink-soft)]">{c.student_b_department}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--sea-ink-soft)] text-xs">
                    {new Date(c.connected_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Student: peer match recommendations                               */
/* ------------------------------------------------------------------ */
function StudentPeerMatchView() {
  const user = useAuthStore((s) => s.user);

  const { data: result, isLoading, isError, error } = usePeerMatches(user?.id ?? null);
  const { data: outgoing } = useOutgoingRequests();
  const sendRequestMutation = useSendPeerRequest();

  const sentIds = new Set<number>(
    (outgoing ?? [])
      .filter((r) => r.status === "pending" || r.status === "accepted")
      .map((r) => r.to_student_id)
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-2 text-[var(--sea-ink)]">
        Peer Matching
      </h1>
      <p className="text-[var(--sea-ink-soft)] mb-8">
        Discover study partners whose strengths complement yours for maximum
        academic synergy.
      </p>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-300">
          {(error as Error).message}
        </div>
      )}

      {sendRequestMutation.isError && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
          {(sendRequestMutation.error as Error).message}
        </div>
      )}

      {result && (
        <div className="grid gap-5 sm:grid-cols-2">
          {result.matches.map((m, i) => (
            <PeerCard
              key={m.peer_id}
              match={m}
              rank={i + 1}
              sentIds={sentIds}
              onConnect={(peerId) => sendRequestMutation.mutate(peerId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
