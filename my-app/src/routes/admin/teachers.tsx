import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Search, Pencil, AlertCircle } from "lucide-react";
import api from "../../lib/api";
import { useAuthStore } from "../../lib/auth";

export const Route = createFileRoute("/admin/teachers")({
  component: AdminTeachers,
});

interface TeacherRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  department: string | null;
  created_at: string;
}

function AdminTeachers() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [filtered, setFiltered] = useState<TeacherRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate({ to: "/" });
      return;
    }
    api
      .get<TeacherRow[]>("/api/v1/teachers/")
      .then(({ data }) => {
        setTeachers(data);
        setFiltered(data);
      })
      .catch(() => setError("Failed to load teachers."))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      teachers.filter(
        (t) =>
          `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          (t.department ?? "").toLowerCase().includes(q)
      )
    );
  }, [search, teachers]);

  return (
    <main className="page-wrap px-4 pb-12 pt-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(99,102,241,0.12)]">
            <BookOpen className="h-5 w-5 text-[#6366f1]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--sea-ink)]">
              Teachers Dashboard
            </h1>
            <p className="text-sm text-[var(--sea-ink-soft)]">
              Manage all staff records
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-[rgba(99,102,241,0.1)] px-3 py-1.5 text-sm font-semibold text-[#6366f1]">
            {teachers.length} Teachers
          </span>
          <Link
            to="/admin/dashboard"
            className="rounded-xl border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
          >
            ← Students
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sea-ink-soft)]" />
        <input
          type="text"
          placeholder="Search by name, email or department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--island-bg)] py-2.5 pl-9 pr-4 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.4)]"
        />
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="island-shell overflow-hidden rounded-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#6366f1]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-[var(--sea-ink-soft)]">
            No teachers found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--island-bg)]">
                  <th className="px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">Department</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">Joined</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`border-b border-[var(--line)] transition hover:bg-[var(--island-bg)] ${i % 2 === 0 ? "" : "bg-[rgba(0,0,0,0.01)]"}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[var(--sea-ink-soft)]">#{t.id}</td>
                    <td className="px-4 py-3 font-medium text-[var(--sea-ink)]">
                      {t.first_name} {t.last_name}
                    </td>
                    <td className="px-4 py-3 text-[var(--sea-ink-soft)]">{t.email}</td>
                    <td className="px-4 py-3">
                      {t.department ? (
                        <span className="rounded-lg bg-[rgba(99,102,241,0.12)] px-2.5 py-0.5 text-xs font-semibold text-[#6366f1]">
                          {t.department}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--sea-ink-soft)]">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/admin/teachers/$teacherId"
                        params={{ teacherId: String(t.id) }}
                        className="flex w-fit items-center gap-1 rounded-lg bg-[rgba(99,102,241,0.1)] px-2.5 py-1 text-xs font-medium text-[#6366f1] transition hover:bg-[rgba(99,102,241,0.2)]"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
