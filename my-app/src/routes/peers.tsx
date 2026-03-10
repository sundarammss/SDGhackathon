import { createFileRoute } from "@tanstack/react-router";
import { usePeerMatches, useStudents } from "../lib/hooks";
import { useAuthStore } from "../lib/auth";
import { useState } from "react";
import type { PeerMatch } from "../lib/api";

export const Route = createFileRoute("/peers")({
  component: PeersPage,
});

/* ------------------------------------------------------------------ */
/*  Strength badge colour                                             */
/* ------------------------------------------------------------------ */
const strengthColours: Record<string, string> = {
  "quantitative-reasoning": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  writing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "time-management": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "critical-thinking": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "lab-skills": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  presentation: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  coding: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  "research-methodology": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
};

function badgeClass(strength: string) {
  return strengthColours[strength] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

/* ------------------------------------------------------------------ */
/*  Compatibility bar                                                 */
/* ------------------------------------------------------------------ */
function CompatibilityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const colour =
    pct >= 80
      ? "bg-green-500"
      : pct >= 60
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
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
function PeerCard({ match, rank }: { match: PeerMatch; rank: number }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
            #{rank}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {match.peer_name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Student ID: {match.peer_id}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
          Compatibility
        </p>
        <CompatibilityBar score={match.compatibility_score} />
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
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

  /* Students use own id, advisors/admins pick a student */
  const [selectedId, setSelectedId] = useState<number | null>(
    isStudent && user ? user.id : null
  );

  const { data: students } = useStudents();
  const {
    data: result,
    isLoading,
    isError,
    error,
  } = usePeerMatches(selectedId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        Peer Matching
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Discover study partners whose strengths complement yours for maximum
        academic synergy.
      </p>

      {/* Student selector (advisors / admins only) */}
      {!isStudent && (
        <div className="mb-8">
          <label
            htmlFor="student-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Select a student
          </label>
          <select
            id="student-select"
            className="w-full max-w-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedId ?? ""}
            onChange={(e) =>
              setSelectedId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">-- Choose --</option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name} (ID {s.id})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* States */}
      {selectedId === null && (
        <p className="text-gray-500 dark:text-gray-400 italic">
          Please select a student to view peer matches.
        </p>
      )}

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

      {result && (
        <div className="grid gap-5 sm:grid-cols-2">
          {result.matches.map((m, i) => (
            <PeerCard key={m.peer_id} match={m} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
