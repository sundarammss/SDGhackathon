import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "../lib/auth";
import {
  useExamMarks,
  useCreateExamMark,
  useUpdateExamMark,
  useDeleteExamMark,
  useStudents,
} from "../lib/hooks";
import type { ExamMarkOut } from "../lib/api";
import { BookOpen, Pencil, Trash2, Plus, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/portal")({
  component: Portal,
});

/* ── Helpers ─────────────────────────────────────────────────────── */

function today() {
  return new Date().toISOString().split("T")[0];
}

/* ── Portal Page ─────────────────────────────────────────────────── */

function Portal() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  if (!user || user.role !== "advisor") {
    return (
      <main className="page-wrap px-4 py-12">
        <div className="island-shell rounded-2xl p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          <p className="text-lg font-semibold text-[var(--sea-ink)]">
            Access Restricted
          </p>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            The Portal is available to Advisors only.
          </p>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="mt-4 rounded-xl bg-[rgba(79,184,178,0.15)] px-4 py-2 text-sm font-semibold text-[#4fb8b2] hover:bg-[rgba(79,184,178,0.25)] transition"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return <AdvisorPortal />;
}

/* ── Advisor Portal ──────────────────────────────────────────────── */

type FormState = {
  student_id: string;
  exam_name: string;
  marks: string;
  exam_date: string;
};

const emptyForm: FormState = {
  student_id: "",
  exam_name: "",
  marks: "",
  exam_date: today(),
};

function AdvisorPortal() {
  const { data: students = [] } = useStudents();
  const [filterStudentId, setFilterStudentId] = useState<number | undefined>();
  const { data: marks = [], isLoading, isError } = useExamMarks(filterStudentId);

  const createMark = useCreateExamMark();
  const updateMark = useUpdateExamMark();
  const deleteMark = useDeleteExamMark();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");

  /* ── Form helpers ── */
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function startEdit(mark: ExamMarkOut) {
    setEditingId(mark.id);
    setForm({
      student_id: String(mark.student_id),
      exam_name: mark.exam_name,
      marks: String(mark.marks),
      exam_date: mark.exam_date,
    });
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const sid = parseInt(form.student_id);
    const m = parseFloat(form.marks);

    if (!sid || !form.exam_name.trim() || isNaN(m) || !form.exam_date) {
      setFormError("All fields are required.");
      return;
    }
    if (m < 0 || m > 100) {
      setFormError("Marks must be between 0 and 100.");
      return;
    }

    try {
      if (editingId !== null) {
        await updateMark.mutateAsync({
          examId: editingId,
          payload: {
            exam_name: form.exam_name.trim(),
            marks: m,
            exam_date: form.exam_date,
          },
        });
        setEditingId(null);
      } else {
        await createMark.mutateAsync({
          student_id: sid,
          exam_name: form.exam_name.trim(),
          marks: m,
          exam_date: form.exam_date,
        });
      }
      setForm(emptyForm);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.detail ?? "An error occurred. Please try again."
      );
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this exam record?")) return;
    await deleteMark.mutateAsync(id);
  }

  const isBusy = createMark.isPending || updateMark.isPending;

  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      {/* Header */}
      <section className="mb-8">
        <p className="island-kicker mb-1">Advisor Portal</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Exam Marks Manager
        </h1>
        <p className="mt-2 text-[var(--sea-ink-soft)]">
          Record, edit, and manage exam results for your students.
        </p>
      </section>

      {/* Add / Edit Form */}
      <section className="island-shell mb-8 rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--sea-ink)]">
          <Plus className="h-5 w-5 text-[#4fb8b2]" />
          {editingId !== null ? "Edit Record" : "Add Exam Record"}
        </h2>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Student */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
              Student
            </label>
            <select
              name="student_id"
              value={form.student_id}
              onChange={handleChange}
              disabled={editingId !== null}
              className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)] disabled:opacity-60"
            >
              <option value="">Select student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
              Exam Name
            </label>
            <select
              name="exam_name"
              value={form.exam_name}
              onChange={handleChange}
              className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
            >
              <option value="">Select exam…</option>
              <option value="Internal 1">Internal 1</option>
              <option value="Internal 2">Internal 2</option>
              <option value="Internal 3">Internal 3</option>
              <option value="End Semester">End Semester</option>
            </select>
          </div>

          {/* Marks */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
              Marks (0–100)
            </label>
            <input
              type="number"
              name="marks"
              value={form.marks}
              onChange={handleChange}
              placeholder="85"
              min={0}
              max={100}
              step={0.5}
              className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
            />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
              Exam Date
            </label>
            <input
              type="date"
              name="exam_date"
              value={form.exam_date}
              onChange={handleChange}
              className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
            />
          </div>

          {/* Error + Buttons */}
          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-3">
            {formError && (
              <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
            )}
            <div className="ml-auto flex gap-2">
              {editingId !== null && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isBusy}
                className="rounded-xl bg-[rgba(79,184,178,0.15)] px-5 py-2 text-sm font-semibold text-[#4fb8b2] hover:bg-[rgba(79,184,178,0.25)] transition disabled:opacity-50"
              >
                {isBusy
                  ? "Saving…"
                  : editingId !== null
                  ? "Update Record"
                  : "Add Record"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Records Table */}
      <section className="island-shell rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--sea-ink)]">
            <BookOpen className="h-5 w-5 text-[#4fb8b2]" />
            Exam Records
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-[var(--sea-ink-soft)]">
              Filter by student
            </label>
            <select
              value={filterStudentId ?? ""}
              onChange={(e) =>
                setFilterStudentId(
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
            >
              <option value="">All students</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-[rgba(79,184,178,0.3)] border-t-[rgba(79,184,178,1)]" />
            <span className="ml-3 text-sm text-[var(--sea-ink-soft)]">Loading…</span>
          </div>
        ) : isError ? (
          <p className="text-center text-sm text-red-500">Failed to load exam records.</p>
        ) : marks.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--sea-ink-soft)]">
            No exam records found.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--island-bg)]">
                  {["Student", "Exam Name", "Marks", "Date", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 font-semibold text-[var(--sea-ink-soft)]"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {marks.map((m) => (
                  <tr
                    key={m.id}
                    className={`border-b border-[var(--line)] transition hover:bg-[var(--island-bg)] ${
                      editingId === m.id
                        ? "bg-[rgba(79,184,178,0.06)]"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">{m.student_name}</td>
                    <td className="px-4 py-3">{m.exam_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          m.marks >= 75
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : m.marks >= 50
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        {m.marks}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--sea-ink-soft)]">
                      {m.exam_date}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(m)}
                          title="Edit"
                          className="rounded-lg p-1.5 text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] hover:text-[#4fb8b2] transition"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          title="Delete"
                          disabled={deleteMark.isPending}
                          className="rounded-lg p-1.5 text-[var(--sea-ink-soft)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
