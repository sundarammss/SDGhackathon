import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useDashboardSummary, useRiskProfile } from "../lib/hooks";
import { useAuthStore } from "../lib/auth";
import type { CohortRiskRow, CourseDifficultyRow } from "../lib/api";
import {
  AlertTriangle,
  Users,
  HeartPulse,
  BookOpen,
  ArrowUpDown,
  Search,
  TrendingUp,
  Brain,
  Activity,
  Star,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

/* ── Helpers ──────────────────────────────────────────────────────────── */

function riskColor(risk: number) {
  if (risk >= 0.6) return "text-red-600 dark:text-red-400";
  if (risk >= 0.4) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function riskBadge(risk: number) {
  if (risk >= 0.6)
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  if (risk >= 0.4)
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
}

function healthBar(score: number) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 70
      ? "bg-emerald-500"
      : pct >= 50
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-[var(--progress-track)]">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium">{score}</span>
    </div>
  );
}

function burnoutLabel(cat: string) {
  const map: Record<string, { label: string; cls: string }> = {
    none: {
      label: "Healthy",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    disengagement: {
      label: "Disengaged",
      cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    },
    conceptual_confusion: {
      label: "Confused",
      cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    },
    cognitive_overload: {
      label: "Overloaded",
      cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    },
  };
  const m = map[cat] ?? { label: cat, cls: "bg-[rgba(79,184,178,0.1)] text-[var(--sea-ink-soft)]" };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function difficultyHeat(rating: number) {
  if (rating >= 0.75) return "bg-red-500";
  if (rating >= 0.55) return "bg-amber-500";
  return "bg-emerald-500";
}

/* ── Student Risk Table Columns ───────────────────────────────────── */

const cohortColumns: ColumnDef<CohortRiskRow>[] = [
  {
    accessorKey: "student_name",
    header: "Student",
    cell: (info) => (
      <span className="font-medium">{info.getValue<string>()}</span>
    ),
  },
  { accessorKey: "department", header: "Department" },
  { accessorKey: "section", header: "Section" },
  { accessorKey: "batch", header: "Batch" },
  {
    accessorKey: "at_risk_probability",
    header: "Risk",
    cell: (info) => {
      const v = info.getValue<number>();
      return (
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${riskBadge(v)}`}
        >
          {(v * 100).toFixed(0)}%
        </span>
      );
    },
  },
  {
    accessorKey: "academic_health_score",
    header: "Health Score",
    cell: (info) => healthBar(info.getValue<number>()),
  },
  {
    accessorKey: "cis_score",
    header: "CIS Score",
    cell: (info) => {
      const v = info.getValue<number | null>();
      return v != null ? (
        <span className="font-bold text-[var(--sea-ink)]">{v.toFixed(1)}</span>
      ) : (
        <span className="text-sm text-[var(--sea-ink-soft)]">—</span>
      );
    },
  },
  {
    accessorKey: "burnout_category",
    header: "Burnout Filter",
    cell: (info) => burnoutLabel(info.getValue<string>()),
  },
  { accessorKey: "top_risk_factor", header: "Top Factor" },
];

/* ── Course Heatmap Table Columns ─────────────────────────────────── */

const courseColumns: ColumnDef<CourseDifficultyRow>[] = [
  {
    accessorKey: "course_code",
    header: "Code",
    cell: (info) => (
      <span className="font-mono font-semibold">{info.getValue<string>()}</span>
    ),
  },
  { accessorKey: "course_title", header: "Course" },
  { accessorKey: "department", header: "Dept" },
  {
    accessorKey: "difficulty_rating",
    header: "Difficulty",
    cell: (info) => {
      const v = info.getValue<number>();
      return (
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${difficultyHeat(v)}`}
          />
          <span className="text-sm">{(v * 100).toFixed(0)}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: "avg_student_risk",
    header: "Avg Student Risk",
    cell: (info) => {
      const v = info.getValue<number>();
      return (
        <span className={`font-semibold ${riskColor(v)}`}>
          {(v * 100).toFixed(0)}%
        </span>
      );
    },
  },
  { accessorKey: "enrollment_count", header: "Enrolled" },
];

/* ── Reusable DataTable ───────────────────────────────────────────── */

function DataTable<T>({
  data,
  columns,
  searchPlaceholder,
}: {
  data: T[];
  columns: ColumnDef<T, any>[];
  searchPlaceholder: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sea-ink-soft)]" />
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--island-bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
        <table className="w-full text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-b border-[var(--line)] bg-[var(--island-bg)]"
              >
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none px-4 py-3 font-semibold text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--line)] transition hover:bg-[var(--island-bg)]"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-[var(--sea-ink-soft)]"
                >
                  No data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Dashboard Page ───────────────────────────────────────────────── */

function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, error } = useDashboardSummary();
  const isAdvisor = user?.role === "advisor";
  const [batchFilter, setBatchFilter] = useState("");

  if (user?.role === "student") {
    return <StudentPersonalDashboard />;
  }

  if (isLoading) {
    return (
      <main className="page-wrap px-4 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[rgba(79,184,178,0.3)] border-t-[rgba(79,184,178,1)]" />
          <span className="ml-3 text-[var(--sea-ink-soft)]">
            Loading dashboard…
          </span>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="page-wrap px-4 py-12">
        <div className="island-shell rounded-2xl p-6 text-center text-red-600">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
          <p>Failed to load dashboard. Is the backend running?</p>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            {(error as Error)?.message}
          </p>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const batchOptions = isAdvisor
    ? [...new Set(data.cohort_risks.map((r) => r.batch).filter(Boolean))] as string[]
    : [];

  const filteredCohortRisks = isAdvisor && batchFilter
    ? data.cohort_risks.filter((r) => r.batch === batchFilter)
    : data.cohort_risks;
  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      {/* Header */}
      <section className="mb-8">
        <p className="island-kicker mb-1">AI-OS</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Institutional Intelligence Dashboard
        </h1>
        <p className="mt-2 text-[var(--sea-ink-soft)]">
          Real-time cohort risk clusters, burnout analysis & course difficulty
          heatmap.
        </p>
      </section>

      {/* KPI Cards */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          icon={<Users className="h-5 w-5" />}
          label="Total Students"
          value={data.total_students}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/30"
        />
        <KPICard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="At-Risk Students"
          value={data.at_risk_count}
          color="text-red-600 dark:text-red-400"
          bg="bg-red-50 dark:bg-red-900/30"
        />
        <KPICard
          icon={<HeartPulse className="h-5 w-5" />}
          label="Avg Health Score"
          value={data.avg_health_score}
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-900/30"
        />
        <KPICard
          icon={<BookOpen className="h-5 w-5" />}
          label="Courses Tracked"
          value={data.course_heatmap.length}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-900/30"
        />
      </section>

      {/* Cohort Risk Table */}
      <section className="island-shell mb-8 rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--sea-ink)]">
            Cohort Risk Clusters
          </h2>
          {isAdvisor && batchOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="batch-filter"
                className="text-sm font-medium text-[var(--sea-ink-soft)]"
              >
                Batch
              </label>
              <select
                id="batch-filter"
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
              >
                <option value="">All batches</option>
                {batchOptions.sort().map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <DataTable
          data={filteredCohortRisks}
          columns={cohortColumns}
          searchPlaceholder="Search students, department…"
        />
      </section>

      {/* Course Heatmap Table */}
      <section className="island-shell rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-bold text-[var(--sea-ink)]">
          Course Difficulty Heatmap
        </h2>
        <DataTable
          data={data.course_heatmap}
          columns={courseColumns}
          searchPlaceholder="Search courses, departments…"
        />
      </section>
    </main>
  );
}

/* ── Student Personal Dashboard ───────────────────────────────────── */

function StudentPersonalDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, error } = useRiskProfile(user?.id ?? null);

  if (isLoading) {
    return (
      <main className="page-wrap px-4 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[rgba(79,184,178,0.3)] border-t-[rgba(79,184,178,1)]" />
          <span className="ml-3 text-[var(--sea-ink-soft)]">Loading your profile…</span>
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="page-wrap px-4 py-12">
        <div className="island-shell rounded-2xl p-6 text-center text-red-600">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
          <p>Failed to load your profile.</p>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">{(error as Error)?.message}</p>
        </div>
      </main>
    );
  }

  const riskPct = Math.round(data.at_risk_probability * 100);
  const healthPct = data.academic_health_score;

  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      {/* Header */}
      <section className="mb-8">
        <p className="island-kicker mb-1">My Dashboard</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Welcome back, {user?.name}
        </h1>
        <p className="mt-2 text-[var(--sea-ink-soft)]">
          Here's your academic health snapshot.
        </p>
      </section>

      {/* KPI Cards */}
      <section className="mb-8 grid gap-4 sm:grid-cols-4">
        <KPICard
          icon={<Star className="h-5 w-5" />}
          label="CIS Score"
          value={data.cis_score != null ? Number(data.cis_score.toFixed(1)) : ("—" as any)}
          color="text-indigo-600 dark:text-indigo-400"
          bg="bg-indigo-50 dark:bg-indigo-900/30"
        />
        <KPICard
          icon={<Activity className="h-5 w-5" />}
          label="Risk Score"
          value={riskPct}
          color={riskPct >= 60 ? "text-red-600 dark:text-red-400" : riskPct >= 40 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}
          bg={riskPct >= 60 ? "bg-red-50 dark:bg-red-900/30" : riskPct >= 40 ? "bg-amber-50 dark:bg-amber-900/30" : "bg-emerald-50 dark:bg-emerald-900/30"}
          suffix="%"
        />
        <KPICard
          icon={<HeartPulse className="h-5 w-5" />}
          label="Health Score"
          value={healthPct}
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-900/30"
        />
        <div className="island-shell flex items-center gap-4 rounded-2xl p-5">
          <div className="rounded-xl p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-[var(--sea-ink-soft)]">Burnout Status</p>
            <p className="text-lg font-bold capitalize text-[var(--sea-ink)]">
              {data.burnout_category === "none" ? "Healthy" : data.burnout_category.replace("_", " ")}
            </p>
          </div>
        </div>
      </section>

      {/* Risk breakdown (SHAP) */}
      {data.shap_explanation.length > 0 && (
        <section className="island-shell mb-8 rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-bold text-[var(--sea-ink)]">
            What's Affecting Your Score
          </h2>
          <div className="space-y-3">
            {data.shap_explanation.map((f) => {
              const impact = Math.abs(f.impact);
              const maxImpact = Math.max(...data.shap_explanation.map((x) => Math.abs(x.impact)));
              const pct = maxImpact > 0 ? (impact / maxImpact) * 100 : 0;
              const isNegative = f.impact > 0; // higher SHAP = higher risk = bad
              return (
                <div key={f.feature}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium capitalize text-[var(--sea-ink)]">
                      {f.feature.replace(/_/g, " ")}
                    </span>
                    <span className={isNegative ? "text-red-500" : "text-emerald-500"}>
                      {isNegative ? "↑ Risk" : "↓ Risk"}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--progress-track)]">
                    <div
                      className={`h-2 rounded-full ${isNegative ? "bg-red-400" : "bg-emerald-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recommended interventions */}
      {data.recommended_interventions.length > 0 && (
        <section className="island-shell rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-bold text-[var(--sea-ink)]">
            <TrendingUp className="mr-2 inline h-5 w-5 text-[#4fb8b2]" />
            Recommended Actions
          </h2>
          <ul className="space-y-2">
            {data.recommended_interventions.map((msg, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--sea-ink-soft)]">
                <span className="mt-0.5 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-[#4fb8b2]" />
                {msg}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

/* ── KPI Card ─────────────────────────────────────────────────────── */

function KPICard({
  icon,
  label,
  value,
  color,
  bg,
  suffix = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
  suffix?: string;
}) {
  return (
    <div className="island-shell flex items-center gap-4 rounded-2xl p-5">
      <div className={`rounded-xl p-3 ${bg} ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-[var(--sea-ink-soft)]">{label}</p>
        <p className="text-2xl font-bold text-[var(--sea-ink)]">{value}{suffix}</p>
      </div>
    </div>
  );
}
