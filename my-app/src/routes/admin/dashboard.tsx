import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Search, Eye, Pencil, AlertCircle, Plus, X } from "lucide-react";
import api from "../../lib/api";
import { useAuthStore } from "../../lib/auth";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

interface StudentRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  section: string | null;
  batch_start_year: number | null;
  batch_end_year: number | null;
  leetcode_id: string | null;
  created_at: string;
}

const DEPARTMENTS = ["CSBS", "IT", "AIDS"];
const SECTIONS: Record<string, string[]> = {
  CSBS: [],
  IT: ["A", "B"],
  AIDS: ["A", "B"],
};

const emptyStudentForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  department: "",
  section: "",
  batch_start_year: "",
  batch_end_year: "",
  leetcode_id: "",
};

function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [filtered, setFiltered] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ── Add Student Modal ── */
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyStudentForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate({ to: "/" });
      return;
    }
    api
      .get<StudentRow[]>("/api/v1/students/")
      .then(({ data }) => {
        setStudents(data);
        setFiltered(data);
      })
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      students.filter(
        (s) =>
          `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.department ?? "").toLowerCase().includes(q) ||
          (s.section ?? "").toLowerCase().includes(q)
      )
    );
  }, [search, students]);

  function openModal() {
    setForm(emptyStudentForm);
    setFormError("");
    setShowModal(true);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f) => {
      const updated = { ...f, [name]: value };
      // reset section when department changes
      if (name === "department") updated.section = "";
      return updated;
    });
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      setFormError("First name, last name, and email are required.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        department: form.department || null,
        section: form.section || null,
        batch_start_year: form.batch_start_year ? parseInt(form.batch_start_year) : null,
        batch_end_year: form.batch_end_year ? parseInt(form.batch_end_year) : null,
        leetcode_id: form.leetcode_id.trim() || null,
      };
      const { data } = await api.post<StudentRow>("/api/v1/students/", payload);
      setStudents((prev) => [data, ...prev]);
      setShowModal(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail ?? "Failed to create student.");
    } finally {
      setSaving(false);
    }
  }

  const sectionOptions = form.department ? SECTIONS[form.department] ?? [] : [];

  return (
    <main className="page-wrap px-4 pb-12 pt-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(245,158,11,0.12)]">
            <Users className="h-5 w-5 text-[#f59e0b]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--sea-ink)]">
              Admin Dashboard
            </h1>
            <p className="text-sm text-[var(--sea-ink-soft)]">
              Manage all student records
            </p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-xl bg-[rgba(245,158,11,0.12)] px-4 py-2 text-sm font-semibold text-[#f59e0b] transition hover:bg-[rgba(245,158,11,0.22)]"
        >
          <Plus className="h-4 w-4" />
          Add Student
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sea-ink-soft)]" />
        <input
          type="text"
          placeholder="Search by name, email, department or section…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--island-bg)] py-2.5 pl-9 pr-4 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(245,158,11,0.4)]"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--sea-ink-soft)]">
          {filtered.length} of {students.length} Students
        </span>
      </div>
      <div className="island-shell overflow-hidden rounded-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#f59e0b]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-[var(--sea-ink-soft)]">
            No students found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--island-bg)]">
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">
                    ID
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">
                    Name
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">
                    Email
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">
                    Phone
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">
                    Department
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">
                    Section
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">
                    Batch
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">
                    Created
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--sea-ink-soft)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`border-b border-[var(--line)] transition hover:bg-[var(--island-bg)] ${
                      i % 2 === 0 ? "" : "bg-[rgba(0,0,0,0.01)]"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[var(--sea-ink-soft)]">
                      #{s.id}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--sea-ink)]">
                      {s.first_name} {s.last_name}
                    </td>
                    <td className="px-4 py-3 text-[var(--sea-ink-soft)]">
                      {s.email}
                    </td>
                    <td className="px-4 py-3 text-[var(--sea-ink-soft)]">
                      {s.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {s.department ? (
                        <span className="rounded-lg bg-[rgba(79,184,178,0.12)] px-2.5 py-0.5 text-xs font-semibold text-[#4fb8b2]">
                          {s.department}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--sea-ink-soft)]">
                      {s.section ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--sea-ink-soft)]">
                      {s.batch_start_year && s.batch_end_year
                        ? `${s.batch_start_year}–${s.batch_end_year}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--sea-ink-soft)]">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/admin/students/$studentId"
                          params={{ studentId: String(s.id) }}
                          className="flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs font-medium text-[var(--sea-ink)] transition hover:bg-[rgba(79,184,178,0.08)] hover:text-[#4fb8b2]"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Link>
                        <Link
                          to="/admin/students/$studentId"
                          params={{ studentId: String(s.id) }}
                          search={{ edit: true }}
                          className="flex items-center gap-1 rounded-lg bg-[rgba(245,158,11,0.1)] px-2.5 py-1 text-xs font-medium text-[#f59e0b] transition hover:bg-[rgba(245,158,11,0.2)]"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="island-shell w-full max-w-lg rounded-2xl p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--sea-ink)]">Add New Student</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-[var(--sea-ink-soft)] hover:bg-[var(--island-bg)] transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">First Name *</label>
                <input name="first_name" value={form.first_name} onChange={handleFormChange} placeholder="Alice" className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(245,158,11,0.4)]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Last Name *</label>
                <input name="last_name" value={form.last_name} onChange={handleFormChange} placeholder="Smith" className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(245,158,11,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Email *</label>
                <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="alice@example.com" className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(245,158,11,0.4)]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Phone</label>
                <input name="phone" value={form.phone} onChange={handleFormChange} placeholder="+91 99999 00000" className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(245,158,11,0.4)]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Department</label>
                <select name="department" value={form.department} onChange={handleFormChange} className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(245,158,11,0.4)]">
                  <option value="">Select…</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {sectionOptions.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Section</label>
                  <select name="section" value={form.section} onChange={handleFormChange} className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(245,158,11,0.4)]">
                    <option value="">Select…</option>
                    {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Batch Start Year</label>
                <input type="number" name="batch_start_year" value={form.batch_start_year} onChange={handleFormChange} placeholder="2023" className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(245,158,11,0.4)]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Batch End Year</label>
                <input type="number" name="batch_end_year" value={form.batch_end_year} onChange={handleFormChange} placeholder="2027" className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(245,158,11,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">LeetCode ID</label>
                <input name="leetcode_id" value={form.leetcode_id} onChange={handleFormChange} placeholder="e.g. alice_codes" className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(245,158,11,0.4)]" />
              </div>
              {formError && (
                <p className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{formError}</p>
              )}
              <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink-soft)] hover:bg-[var(--island-bg)] transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-[rgba(245,158,11,0.12)] px-5 py-2 text-sm font-semibold text-[#f59e0b] hover:bg-[rgba(245,158,11,0.22)] transition disabled:opacity-50">
                  {saving ? "Saving…" : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
