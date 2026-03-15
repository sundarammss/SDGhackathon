import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useAuthStore } from "../lib/auth";
import {
  useMyCompetitions,
  useSubmitCompetition,
} from "../lib/hooks";
import { fetchProofBlob, type CompetitionOut } from "../lib/api";
import {
  Trophy,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  X,
  Eye,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/competitions")({
  component: CompetitionPage,
});

/* ── Badge helpers ───────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Winner"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      : status === "Runner-up"
        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
        : "bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-300";
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function ApprovalBadge({ status }: { status: string }) {
  if (status === "Approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  }
  if (status === "Rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

/* ── Submission Form ─────────────────────────────────────────────── */

const STATUS_OPTIONS = ["Participated", "Runner-up", "Winner"] as const;

function SubmitForm({ onClose }: { onClose: () => void }) {
  const submit = useSubmitCompetition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    competition_name: "",
    competition_date: "",
    status: "Participated",
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [formError, setFormError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["jpg", "jpeg", "pdf"].includes(ext)) {
      setFileError("Only JPG, JPEG, or PDF files are allowed.");
      e.target.value = "";
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setFileError("File size must not exceed 5 MB.");
      e.target.value = "";
      return;
    }
    setFileError("");
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.competition_name.trim()) {
      setFormError("Competition name is required.");
      return;
    }
    if (!form.competition_date) {
      setFormError("Competition date is required.");
      return;
    }
    if (!file) {
      setFormError("Please upload a proof document.");
      return;
    }

    const fd = new FormData();
    fd.append("competition_name", form.competition_name.trim());
    fd.append("competition_date", form.competition_date);
    fd.append("competition_status", form.status);
    fd.append("proof", file);

    try {
      await submit.mutateAsync(fd);
      onClose();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.detail ?? "Submission failed. Please try again."
      );
    }
  }

  return (
    <div className="island-shell mb-8 rounded-2xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[var(--lagoon)]" />
          <h2 className="text-lg font-bold text-[var(--sea-ink)]">
            Submit Competition Entry
          </h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-[var(--sea-ink-soft)] transition hover:bg-[var(--island-bg)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        {/* Competition Name */}
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
            Competition Name *
          </label>
          <input
            required
            value={form.competition_name}
            onChange={(e) =>
              setForm((f) => ({ ...f, competition_name: e.target.value }))
            }
            placeholder="e.g. Regional Coding Challenge 2025"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
          />
        </div>

        {/* Competition Date */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
            Competition Date *
          </label>
          <input
            required
            type="date"
            value={form.competition_date}
            onChange={(e) =>
              setForm((f) => ({ ...f, competition_date: e.target.value }))
            }
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
          />
        </div>

        {/* Result */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
            Result *
          </label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({ ...f, status: e.target.value }))
            }
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Proof Document */}
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
            Proof Document * (JPG, JPEG, or PDF — max 5 MB)
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition ${
              file
                ? "border-[var(--lagoon)] bg-[rgba(79,184,178,0.06)]"
                : "border-[var(--line)] hover:border-[rgba(79,184,178,0.5)] hover:bg-[rgba(79,184,178,0.03)]"
            }`}
          >
            <Upload className="h-5 w-5 flex-shrink-0 text-[var(--sea-ink-soft)]" />
            <span className="min-w-0 flex-1 text-sm">
              {file ? (
                <span className="truncate font-medium text-[var(--sea-ink)]">
                  {file.name}
                </span>
              ) : (
                <span className="text-[var(--sea-ink-soft)]">
                  Click to upload proof document
                </span>
              )}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.pdf"
              onChange={handleFile}
              className="hidden"
            />
          </div>
          {fileError && (
            <p className="text-xs font-medium text-red-500">{fileError}</p>
          )}
        </div>

        {formError && (
          <div className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {formError}
          </div>
        )}

        <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink-soft)] transition hover:bg-[var(--island-bg)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submit.isPending}
            className="rounded-xl bg-[rgba(79,184,178,0.15)] px-5 py-2 text-sm font-semibold text-[#4fb8b2] transition hover:bg-[rgba(79,184,178,0.25)] disabled:opacity-50"
          >
            {submit.isPending ? "Submitting…" : "Submit Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Competition Card ────────────────────────────────────────────── */

function CompetitionCard({ comp }: { comp: CompetitionOut }) {
  const [loading, setLoading] = useState(false);

  async function handleViewProof() {
    setLoading(true);
    try {
      const blob = await fetchProofBlob(comp.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      alert("Failed to load proof file.");
    } finally {
      setLoading(false);
    }
  }

  const dateStr = comp.competition_date
    ? new Date(comp.competition_date + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : comp.competition_date;

  return (
    <div className="island-shell flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug text-[var(--sea-ink)]">
          {comp.competition_name}
        </h3>
        <StatusBadge status={comp.status} />
      </div>

      <p className="text-xs text-[var(--sea-ink-soft)]">{dateStr}</p>

      <div className="mt-auto flex items-center justify-between gap-2">
        <ApprovalBadge status={comp.approval_status} />
        {comp.proof_file && (
          <button
            onClick={handleViewProof}
            disabled={loading}
            className="flex items-center gap-1 text-xs font-medium text-[var(--lagoon)] transition hover:underline disabled:opacity-50"
          >
            <Eye className="h-3.5 w-3.5" />
            {loading ? "Loading…" : "View Proof"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Competition List ────────────────────────────────────────────── */

function CompetitionList({
  competitions,
  isLoading,
}: {
  competitions: CompetitionOut[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#4fb8b2]" />
        <span className="ml-2 text-sm text-[var(--sea-ink-soft)]">Loading…</span>
      </div>
    );
  }

  if (!competitions.length) {
    return (
      <div className="island-shell rounded-2xl p-8 text-center">
        <Trophy className="mx-auto mb-3 h-10 w-10 text-[var(--sea-ink-soft)] opacity-40" />
        <p className="text-base font-semibold text-[var(--sea-ink)]">
          No submissions yet
        </p>
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
          Submit your first competition entry using the button above.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {competitions.map((c) => (
        <CompetitionCard key={c.id} comp={c} />
      ))}
    </div>
  );
}

/* ── Competition Manager ─────────────────────────────────────────── */

function CompetitionManager() {
  const [showForm, setShowForm] = useState(false);
  const { data: competitions = [], isLoading } = useMyCompetitions();

  const pending = competitions.filter((c) => c.approval_status === "Pending").length;
  const approved = competitions.filter((c) => c.approval_status === "Approved").length;

  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      <section className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="island-kicker mb-1">Student Portal</p>
          <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
            Competition Manager
          </h1>
          <p className="mt-2 text-[var(--sea-ink-soft)]">
            Submit and track your competition achievements for teacher approval.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-[rgba(79,184,178,0.15)] px-4 py-2.5 text-sm font-semibold text-[#4fb8b2] transition hover:bg-[rgba(79,184,178,0.25)]"
          >
            <Plus className="h-4 w-4" />
            Submit Entry
          </button>
        )}
      </section>

      {/* Stats */}
      {!isLoading && competitions.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="island-shell flex items-center gap-2 rounded-xl px-4 py-2.5">
            <Trophy className="h-4 w-4 text-[var(--lagoon)]" />
            <span className="text-sm font-semibold text-[var(--sea-ink)]">
              {competitions.length} Total
            </span>
          </div>
          {approved > 0 && (
            <div className="island-shell flex items-center gap-2 rounded-xl px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold text-[var(--sea-ink)]">
                {approved} Approved
              </span>
            </div>
          )}
          {pending > 0 && (
            <div className="island-shell flex items-center gap-2 rounded-xl px-4 py-2.5">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-[var(--sea-ink)]">
                {pending} Pending
              </span>
            </div>
          )}
        </div>
      )}

      {showForm && <SubmitForm onClose={() => setShowForm(false)} />}

      <CompetitionList competitions={competitions} isLoading={isLoading} />
    </main>
  );
}

/* ── Page Entry Point ────────────────────────────────────────────── */

function CompetitionPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  if (!user || user.role !== "student") {
    return (
      <main className="page-wrap px-4 py-12">
        <div className="island-shell rounded-2xl p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          <p className="text-lg font-semibold text-[var(--sea-ink)]">
            Access Restricted
          </p>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            The Competition Manager is available to Students only.
          </p>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="mt-4 rounded-xl bg-[rgba(79,184,178,0.15)] px-4 py-2 text-sm font-semibold text-[#4fb8b2] transition hover:bg-[rgba(79,184,178,0.25)]"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return <CompetitionManager />;
}
