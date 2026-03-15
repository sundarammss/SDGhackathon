import { createFileRoute, useNavigate, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Search, Pencil, AlertCircle, Plus, X } from "lucide-react";
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

const DEPARTMENTS = ["CSBS", "IT", "AIDS"];

const emptyTeacherForm = {
  first_name: "",
  last_name: "",
  email: "",
  department: "",
  password: "",
};

function AdminTeachers() {
  const childMatches = useChildMatches();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [filtered, setFiltered] = useState<TeacherRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ── Add Teacher Modal ── */
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyTeacherForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const isChildRoute = childMatches.length > 0;

  useEffect(() => {
    if (isChildRoute) return;
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
  }, [user, navigate, isChildRoute]);

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

  function openModal() {
    setForm(emptyTeacherForm);
    setFormError("");
    setShowModal(true);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleAddTeacher(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError("First name, last name, email, and password are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        department: form.department || null,
        password: form.password,
      };
      const { data } = await api.post<TeacherRow>("/api/v1/teachers/", payload);
      setTeachers((prev) => [data, ...prev]);
      setShowModal(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail ?? "Failed to create teacher.");
    } finally {
      setSaving(false);
    }
  }

  if (isChildRoute) return <Outlet />;

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
        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-xl bg-[rgba(99,102,241,0.12)] px-4 py-2 text-sm font-semibold text-[#6366f1] transition hover:bg-[rgba(99,102,241,0.22)]"
        >
          <Plus className="h-4 w-4" />
          Add Teacher
        </button>
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

      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--sea-ink-soft)]">
          {filtered.length} of {teachers.length} Teachers
        </span>
      </div>
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
            <table className="min-w-[750px] w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--island-bg)]">
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">ID</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">Name</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">Email</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">Department</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">Joined</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">Actions</th>
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

      {/* Add Teacher Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="island-shell w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--sea-ink)]">Add New Teacher</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-[var(--sea-ink-soft)] hover:bg-[var(--island-bg)] transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddTeacher} className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">First Name *</label>
                <input name="first_name" value={form.first_name} onChange={handleFormChange} placeholder="John" className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.4)]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Last Name *</label>
                <input name="last_name" value={form.last_name} onChange={handleFormChange} placeholder="Doe" className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Email *</label>
                <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="john.doe@college.edu" className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.4)]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Department</label>
                <select name="department" value={form.department} onChange={handleFormChange} className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.4)]">
                  <option value="">Select…</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Password *</label>
                <input type="password" name="password" value={form.password} onChange={handleFormChange} placeholder="••••••••" className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.4)]" />
              </div>
              {formError && (
                <p className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{formError}</p>
              )}
              <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink-soft)] hover:bg-[var(--island-bg)] transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-[rgba(99,102,241,0.12)] px-5 py-2 text-sm font-semibold text-[#6366f1] hover:bg-[rgba(99,102,241,0.22)] transition disabled:opacity-50">
                  {saving ? "Saving…" : "Add Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
