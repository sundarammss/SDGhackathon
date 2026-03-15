import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "../lib/auth";
import {
  useExamMarks,
  useCreateExamMark,
  useUpdateExamMark,
  useDeleteExamMark,
  useAttendanceBatches,
  useAttendanceStudents,
  useSubmitAttendance,
  useAllCompetitions,
  useApproveCompetition,
  useRejectCompetition,
  useAssignments,
  useCreateAssignment,
  useDeleteAssignment,
  useAssignmentSubmissions,
  useApproveSubmission,
  fetchSubmissionFile,
} from "../lib/hooks";
import { fetchProofBlob, type ExamMarkOut, type AttendanceRecord, type CompetitionOut } from "../lib/api";
import {
  BookOpen,
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  ClipboardList,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Users,
  Trophy,
  Clock,
  CheckCircle2,
  Eye,
  FileText,
  Calendar,
  Upload,
  ArrowLeft,
} from "lucide-react";

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

  return <AdvisorHub />;
}

/* ── Advisor Hub — choose a manager ─────────────────────────────── */

type View = "home" | "exam-marks" | "attendance" | "competitions" | "assignments";

function AdvisorHub() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("home");

  if (view === "exam-marks") {
    return <AdvisorPortal onBack={() => setView("home")} />;
  }
  if (view === "attendance") {
    return <AttendanceManager onBack={() => setView("home")} />;
  }
  if (view === "competitions") {
    return <CompetitionReview onBack={() => setView("home")} />;
  }
  if (view === "assignments") {
    return <AssignmentManager onBack={() => setView("home")} />;
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      <section className="mb-8">
        <p className="island-kicker mb-1">Advisor Portal</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Teacher Dashboard
        </h1>
        <p className="mt-2 text-[var(--sea-ink-soft)]">
          Select a manager to get started.
        </p>
      </section>

      <div className="grid gap-5 sm:grid-cols-2 max-w-2xl">
        <button
          onClick={() => setView("exam-marks")}
          className="island-shell group flex flex-col items-start gap-3 rounded-2xl p-6 text-left transition hover:ring-2 hover:ring-[rgba(79,184,178,0.5)] focus:outline-none"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(79,184,178,0.12)]">
            <BookOpen className="h-6 w-6 text-[var(--lagoon)]" />
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--sea-ink)] group-hover:text-[var(--lagoon)] transition">
              Exam Marks Manager
            </p>
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              Record, edit, and manage exam results for your students.
            </p>
          </div>
        </button>

        <button
          onClick={() => setView("attendance")}
          className="island-shell group flex flex-col items-start gap-3 rounded-2xl p-6 text-left transition hover:ring-2 hover:ring-[rgba(79,184,178,0.5)] focus:outline-none"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(79,184,178,0.12)]">
            <ClipboardList className="h-6 w-6 text-[var(--lagoon)]" />
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--sea-ink)] group-hover:text-[var(--lagoon)] transition">
              Attendance Manager
            </p>
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              Mark and review daily attendance for your department.
            </p>
          </div>
        </button>

        <button
          onClick={() => setView("competitions")}
          className="island-shell group flex flex-col items-start gap-3 rounded-2xl p-6 text-left transition hover:ring-2 hover:ring-[rgba(79,184,178,0.5)] focus:outline-none"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(79,184,178,0.12)]">
            <Trophy className="h-6 w-6 text-[var(--lagoon)]" />
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--sea-ink)] group-hover:text-[var(--lagoon)] transition">
              Competition Manager
            </p>
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              Review, approve, or reject student competition submissions.
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate({ to: "/tasks" })}
          className="island-shell group flex flex-col items-start gap-3 rounded-2xl p-6 text-left transition hover:ring-2 hover:ring-[rgba(79,184,178,0.5)] focus:outline-none"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(79,184,178,0.12)]">
            <CheckCircle2 className="h-6 w-6 text-[var(--lagoon)]" />
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--sea-ink)] group-hover:text-[var(--lagoon)] transition">
              Tasks Manager
            </p>
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              Manage quizzes and assignments in one place.
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate({ to: "/resources" })}
          className="island-shell group flex flex-col items-start gap-3 rounded-2xl p-6 text-left transition hover:ring-2 hover:ring-[rgba(79,184,178,0.5)] focus:outline-none"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(79,184,178,0.12)]">
            <Upload className="h-6 w-6 text-[var(--lagoon)]" />
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--sea-ink)] group-hover:text-[var(--lagoon)] transition">
              Study Resources Manager
            </p>
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              Upload and manage study materials for students.
            </p>
          </div>
        </button>
      </div>
    </main>
  );
}

/* ── Advisor Portal (Exam Marks) ─────────────────────────────────── */

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

function AdvisorPortal({ onBack }: { onBack: () => void }) {
  /* ── Batch / section selection (mirrors AttendanceManager) ── */
  const { data: batches = [], isLoading: batchesLoading } = useAttendanceBatches();
  const [selectedBatchIdx, setSelectedBatchIdx] = useState<number | "">("");
  const selectedBatch = selectedBatchIdx !== "" ? batches[selectedBatchIdx as number] : null;

  const { data: batchStudents = [], isLoading: studentsLoading } = useAttendanceStudents({
    batch_start_year: selectedBatch?.batch_start_year,
    batch_end_year: selectedBatch?.batch_end_year,
    section: selectedBatch?.section ?? undefined,
    enabled: selectedBatch !== null,
  });

  const [filterStudentId, setFilterStudentId] = useState<number | undefined>();
  const { data: marks = [], isLoading, isError } = useExamMarks(
    selectedBatch
      ? {
          batchStartYear: selectedBatch.batch_start_year,
          batchEndYear: selectedBatch.batch_end_year,
          section: selectedBatch.section,
          studentId: filterStudentId,
        }
      : undefined
  );

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
      {/* Back */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm text-[var(--lagoon-deep)] hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Portal
      </button>

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

      {/* Batch / Section Selector */}
      <section className="island-shell mb-6 rounded-2xl p-6">
        <h2 className="mb-4 text-base font-bold text-[var(--sea-ink)]">Select Batch &amp; Section</h2>
        <div className="flex flex-col gap-1 sm:max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
            Batch / Section
          </label>
          {batchesLoading ? (
            <div className="h-10 animate-pulse rounded-xl bg-[var(--island-bg)]" />
          ) : (
            <select
              value={selectedBatchIdx}
              onChange={(e) => {
                setSelectedBatchIdx(e.target.value === "" ? "" : parseInt(e.target.value));
                setFilterStudentId(undefined);
                setForm(emptyForm);
                setEditingId(null);
              }}
              className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
            >
              <option value="">Select batch…</option>
              {batches.map((b, i) => (
                <option key={i} value={i}>
                  {b.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {selectedBatch === null ? (
        <div className="island-shell flex flex-col items-center justify-center rounded-2xl py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-[var(--sea-ink-soft)]" />
          <p className="text-base font-semibold text-[var(--sea-ink)]">No batch selected</p>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            Choose a batch above to load students and exam records.
          </p>
        </div>
      ) : (
        <>
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
              disabled={editingId !== null || studentsLoading}
              className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)] disabled:opacity-60"
            >
              <option value="">Select student…</option>
              {batchStudents.map((s) => (
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
              {batchStudents.map((s) => (
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
        </>
      )}
    </main>
  );
}

/* ── Attendance Manager ──────────────────────────────────────────── */

function AttendanceManager({ onBack }: { onBack: () => void }) {
  const { data: batches = [], isLoading: batchesLoading } = useAttendanceBatches();

  const [selectedBatchIdx, setSelectedBatchIdx] = useState<number | "">("");
  const [attendanceDate, setAttendanceDate] = useState(today());
  const [subject, setSubject] = useState("");

  const selectedBatch =
    selectedBatchIdx !== "" ? batches[selectedBatchIdx as number] : null;

  const {
    data: students = [],
    isLoading: studentsLoading,
    isFetching,
  } = useAttendanceStudents({
    batch_start_year: selectedBatch?.batch_start_year,
    batch_end_year: selectedBatch?.batch_end_year,
    section: selectedBatch?.section ?? undefined,
    enabled: selectedBatch !== null,
  });

  const [attendance, setAttendance] = useState<Record<number, "present" | "absent">>({});
  const [lastStudentIds, setLastStudentIds] = useState<string>("");

  const currentIds = students.map((s) => s.id).join(",");
  if (students.length > 0 && currentIds !== lastStudentIds) {
    const init: Record<number, "present" | "absent"> = {};
    students.forEach((s) => (init[s.id] = "present"));
    setAttendance(init);
    setLastStudentIds(currentIds);
  }

  const submitMutation = useSubmitAttendance();
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function toggleAll(status: "present" | "absent") {
    const next: Record<number, "present" | "absent"> = {};
    students.forEach((s) => (next[s.id] = status));
    setAttendance(next);
  }

  async function handleSubmit() {
    if (!selectedBatch || students.length === 0) return;
    setSubmitMsg(null);
    setSubmitError(null);

    const records: AttendanceRecord[] = students.map((s) => ({
      student_id: s.id,
      status: attendance[s.id] ?? "present",
    }));

    try {
      const result = await submitMutation.mutateAsync({
        date: attendanceDate,
        subject: subject.trim() || undefined,
        records,
      });
      setSubmitMsg(`Attendance saved for ${result.saved} student(s).`);
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.detail ?? "Failed to save attendance. Please try again."
      );
    }
  }

  const presentCount = students.filter((s) => (attendance[s.id] ?? "present") === "present").length;
  const absentCount = students.length - presentCount;

  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      {/* Back */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm text-[var(--lagoon-deep)] hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Portal
      </button>

      {/* Header */}
      <section className="mb-8">
        <p className="island-kicker mb-1">Advisor Portal</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Attendance Manager
        </h1>
        <p className="mt-2 text-[var(--sea-ink-soft)]">
          Select a batch and mark daily attendance for your department.
        </p>
      </section>

      {/* Session Details */}
      <section className="island-shell mb-6 rounded-2xl p-6">
        <h2 className="mb-4 text-base font-bold text-[var(--sea-ink)]">Session Details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Batch selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
              Batch / Section
            </label>
            {batchesLoading ? (
              <div className="h-10 animate-pulse rounded-xl bg-[var(--island-bg)]" />
            ) : (
              <select
                value={selectedBatchIdx}
                onChange={(e) => {
                  setSelectedBatchIdx(
                    e.target.value === "" ? "" : parseInt(e.target.value)
                  );
                  setSubmitMsg(null);
                  setSubmitError(null);
                  setAttendance({});
                  setLastStudentIds("");
                }}
                className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
              >
                <option value="">Select batch…</option>
                {batches.map((b, i) => (
                  <option key={i} value={i}>
                    {b.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
              Date
            </label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
            />
          </div>

          {/* Subject */}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
              Subject <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Data Structures"
              className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
            />
          </div>
        </div>
      </section>

      {/* Student list */}
      {selectedBatch === null ? (
        <div className="island-shell flex flex-col items-center justify-center rounded-2xl py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-[var(--sea-ink-soft)]" />
          <p className="text-base font-semibold text-[var(--sea-ink)]">No batch selected</p>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            Choose a batch above to load the student list.
          </p>
        </div>
      ) : studentsLoading || isFetching ? (
        <div className="island-shell flex items-center justify-center rounded-2xl py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-[rgba(79,184,178,0.3)] border-t-[rgba(79,184,178,1)]" />
          <span className="ml-3 text-sm text-[var(--sea-ink-soft)]">Loading students…</span>
        </div>
      ) : students.length === 0 ? (
        <div className="island-shell flex flex-col items-center justify-center rounded-2xl py-16 text-center">
          <p className="text-sm text-[var(--sea-ink-soft)]">
            No students found for this batch/section.
          </p>
        </div>
      ) : (
        <section className="island-shell rounded-2xl p-6">
          {/* Stats + bulk actions */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-[var(--sea-ink)]">
                <ClipboardList className="h-5 w-5 text-[var(--lagoon)]" />
                {students.length} Student{students.length !== 1 ? "s" : ""}
              </h2>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                ✓ {presentCount} Present
              </span>
              <span className="text-sm font-medium text-red-500">
                ✗ {absentCount} Absent
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAll("present")}
                className="rounded-xl border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20 transition"
              >
                Mark All Present
              </button>
              <button
                onClick={() => toggleAll("absent")}
                className="rounded-xl border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 transition"
              >
                Mark All Absent
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--island-bg)]">
                  {["#", "Name", "Section", "Batch", "Status"].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--sea-ink-soft)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  const status = attendance[s.id] ?? "present";
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-[var(--line)] transition hover:bg-[var(--island-bg)]"
                    >
                      <td className="px-4 py-3 text-[var(--sea-ink-soft)]">{idx + 1}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--sea-ink)]">
                        {s.first_name} {s.last_name}
                      </td>
                      <td className="px-4 py-3 text-[var(--sea-ink-soft)]">
                        {s.section ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--sea-ink-soft)]">
                        {s.batch}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            setAttendance((prev) => ({
                              ...prev,
                              [s.id]: status === "present" ? "absent" : "present",
                            }))
                          }
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                            status === "present"
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                              : "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                          }`}
                        >
                          {status === "present" ? (
                            <CheckCircle className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          {status === "present" ? "Present" : "Absent"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Submit */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {submitMsg && (
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                ✓ {submitMsg}
              </p>
            )}
            {submitError && (
              <p className="text-sm text-red-500">{submitError}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="ml-auto rounded-xl bg-[rgba(79,184,178,0.15)] px-6 py-2.5 text-sm font-semibold text-[#4fb8b2] hover:bg-[rgba(79,184,178,0.25)] transition disabled:opacity-50"
            >
              {submitMutation.isPending ? "Saving…" : "Save Attendance"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

/* ── Competition Review (Teacher) ────────────────────────────────── */

const APPROVAL_FILTERS = ["", "Pending", "Approved", "Rejected"] as const;

function CompetitionReview({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState<string>("Pending");
  const { data: competitions = [], isLoading } = useAllCompetitions(filter || undefined);
  const approve = useApproveCompetition();
  const reject = useRejectCompetition();
  const [actionError, setActionError] = useState<Record<number, string>>({});
  const [viewLoading, setViewLoading] = useState<number | null>(null);

  async function handleApprove(id: number) {
    setActionError((e) => ({ ...e, [id]: "" }));
    try {
      await approve.mutateAsync(id);
    } catch (err: any) {
      setActionError((e) => ({
        ...e,
        [id]: err?.response?.data?.detail ?? "Failed to approve.",
      }));
    }
  }

  async function handleReject(id: number) {
    setActionError((e) => ({ ...e, [id]: "" }));
    try {
      await reject.mutateAsync(id);
    } catch (err: any) {
      setActionError((e) => ({
        ...e,
        [id]: err?.response?.data?.detail ?? "Failed to reject.",
      }));
    }
  }

  async function handleViewProof(comp: CompetitionOut) {
    setViewLoading(comp.id);
    try {
      const blob = await fetchProofBlob(comp.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      alert("Failed to load proof file.");
    } finally {
      setViewLoading(null);
    }
  }

  function approvalBadge(status: string) {
    if (status === "Approved")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </span>
      );
    if (status === "Rejected")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
          <XCircle className="h-3 w-3" /> Rejected
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  }

  function statusBadge(status: string) {
    const cls =
      status === "Winner"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : status === "Runner-up"
          ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-300";
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
        {status}
      </span>
    );
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      {/* Header */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Portal
      </button>

      <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="island-kicker mb-1">Advisor Portal</p>
          <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
            Competition Manager
          </h1>
          <p className="mt-2 text-[var(--sea-ink-soft)]">
            Review and manage student competition submissions.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
            Filter:
          </span>
          <div className="flex gap-1">
            {APPROVAL_FILTERS.map((f) => (
              <button
                key={f || "All"}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filter === f
                    ? "bg-[rgba(79,184,178,0.2)] text-[#4fb8b2]"
                    : "border border-[var(--line)] text-[var(--sea-ink-soft)] hover:bg-[var(--island-bg)]"
                }`}
              >
                {f || "All"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#4fb8b2]" />
          <span className="ml-2 text-sm text-[var(--sea-ink-soft)]">Loading…</span>
        </div>
      ) : competitions.length === 0 ? (
        <div className="island-shell rounded-2xl p-8 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10 text-[var(--sea-ink-soft)] opacity-40" />
          <p className="text-base font-semibold text-[var(--sea-ink)]">
            No competition submissions found
          </p>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            {filter ? `No entries with "${filter}" status.` : "No entries yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                  Student
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                  Competition
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                  Date
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                  Result
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                  Proof
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                  Status
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {competitions.map((comp) => (
                <tr
                  key={comp.id}
                  className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--island-bg)]"
                >
                  <td className="px-3 py-3 font-medium text-[var(--sea-ink)]">
                    {comp.student_name}
                  </td>
                  <td className="px-3 py-3 text-[var(--sea-ink)]">
                    {comp.competition_name}
                  </td>
                  <td className="px-3 py-3 text-[var(--sea-ink-soft)]">
                    {comp.competition_date}
                  </td>
                  <td className="px-3 py-3">
                    {statusBadge(comp.status)}
                  </td>
                  <td className="px-3 py-3">
                    {comp.proof_file ? (
                      <button
                        onClick={() => handleViewProof(comp)}
                        disabled={viewLoading === comp.id}
                        className="flex items-center gap-1 text-xs font-medium text-[var(--lagoon)] transition hover:underline disabled:opacity-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {viewLoading === comp.id ? "Loading…" : "View"}
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--sea-ink-soft)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {approvalBadge(comp.approval_status)}
                  </td>
                  <td className="px-3 py-3">
                    {comp.approval_status === "Pending" ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(comp.id)}
                          disabled={approve.isPending}
                          className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-50 dark:bg-emerald-900/30 dark:text-emerald-300"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(comp.id)}
                          disabled={reject.isPending}
                          className="flex items-center gap-1 rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--sea-ink-soft)]">—</span>
                    )}
                    {actionError[comp.id] && (
                      <p className="mt-1 text-xs text-red-500">
                        {actionError[comp.id]}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

/* ── Assignment Manager ───────────────────────────────────────────── */

type AssignView = "list" | "create" | "submissions";

function AssignmentManager({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<AssignView>("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (view === "create") {
    return <AssignmentCreateForm onBack={() => setView("list")} />;
  }
  if (view === "submissions" && selectedId !== null) {
    return (
      <AssignmentSubmissionsView
        assignmentId={selectedId}
        onBack={() => { setView("list"); setSelectedId(null); }}
      />
    );
  }

  return <AssignmentList
    onBack={onBack}
    onCreate={() => setView("create")}
    onViewSubmissions={(id) => { setSelectedId(id); setView("submissions"); }}
  />;
}

function AssignmentList({
  onBack, onCreate, onViewSubmissions,
}: {
  onBack: () => void;
  onCreate: () => void;
  onViewSubmissions: (id: number) => void;
}) {
  const { data: assignments, isLoading } = useAssignments();
  const deleteMutation = useDeleteAssignment();

  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="mb-3 flex items-center gap-1 text-sm text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Portal
          </button>
          <p className="island-kicker mb-1">Advisor Portal</p>
          <h1 className="display-title text-2xl font-bold text-[var(--sea-ink)] sm:text-3xl">Assignment Manager</h1>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 rounded-lg bg-[var(--lagoon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New Assignment
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--lagoon)] border-t-transparent" />
        </div>
      ) : !assignments?.length ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--island-bg)] p-12 text-center text-[var(--sea-ink-soft)]">
          <FileText className="mx-auto mb-3 h-10 w-10" />
          <p>No assignments yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {assignments.map((a) => {
            const isDue = new Date(a.due_date) < new Date();
            return (
              <div key={a.id} className="island-shell rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-[var(--sea-ink)]">{a.title}</h3>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${isDue ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"}`}>
                    {isDue ? "Past Due" : "Open"}
                  </span>
                </div>
                {a.description && (
                  <p className="mt-1 text-sm text-[var(--sea-ink-soft)] line-clamp-2">{a.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--sea-ink-soft)]">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due {a.due_date}</span>
                  <span>{a.department}</span>
                  <span>{a.batch_start_year}–{a.batch_end_year}</span>
                  {a.section && <span>Sec {a.section}</span>}
                  <span className="font-medium text-[var(--lagoon)]">{a.submission_count} submissions</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => onViewSubmissions(a.id)}
                    className="flex items-center gap-1 rounded-lg bg-[var(--lagoon)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                  >
                    <FileText className="h-3 w-3" /> Submissions
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(a.id)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function AssignmentCreateForm({ onBack }: { onBack: () => void }) {
  const createMutation = useCreateAssignment();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [department, setDepartment] = useState("");
  const [batchStart, setBatchStart] = useState("");
  const [batchEnd, setBatchEnd] = useState("");
  const [section, setSection] = useState("");

  const isValid = title.trim() && dueDate && department.trim() && batchStart && batchEnd;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("description", description.trim());
    fd.append("due_date", dueDate);
    fd.append("department", department.trim());
    fd.append("batch_start_year", batchStart);
    fd.append("batch_end_year", batchEnd);
    fd.append("section", section.trim());
    createMutation.mutate(fd, { onSuccess: onBack });
  };

  const inputCls = "w-full rounded-lg border border-[var(--line)] bg-[var(--island-bg)] px-4 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]";

  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Assignment Manager
      </button>
      <h1 className="mb-6 text-2xl font-bold text-[var(--sea-ink)]">New Assignment</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--island-bg)] p-6">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment title" className={inputCls} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Instructions (optional)" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Due Date *</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Department *</label>
          <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Computer Science" className={inputCls} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Batch Start Year *</label>
            <input type="number" value={batchStart} onChange={(e) => setBatchStart(e.target.value)} placeholder="2022" className={inputCls} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Batch End Year *</label>
            <input type="number" value={batchEnd} onChange={(e) => setBatchEnd(e.target.value)} placeholder="2026" className={inputCls} required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Section (blank = all sections)</label>
          <input type="text" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. A" className={inputCls} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onBack} className="rounded-lg px-4 py-2 text-sm text-[var(--sea-ink-soft)] hover:bg-[var(--surface)]">Cancel</button>
          <button
            type="submit"
            disabled={!isValid || createMutation.isPending}
            className="rounded-lg bg-[var(--lagoon)] px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating…" : "Create Assignment"}
          </button>
        </div>
        {createMutation.isError && <p className="text-sm text-red-500">Failed: {createMutation.error.message}</p>}
      </form>
    </main>
  );
}

function AssignmentSubmissionsView({
  assignmentId, onBack,
}: {
  assignmentId: number;
  onBack: () => void;
}) {
  const { data: submissions, isLoading } = useAssignmentSubmissions(assignmentId);
  const { data: assignments } = useAssignments();
  const approveMutation = useApproveSubmission();
  const [marksInput, setMarksInput] = useState<Record<number, string>>({});
  const [openingId, setOpeningId] = useState<number | null>(null);

  const assignment = assignments?.find((a) => a.id === assignmentId);

  const handleOpenPdf = async (subId: number) => {
    setOpeningId(subId);
    try {
      const blob = await fetchSubmissionFile(subId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      alert("Failed to open PDF.");
    } finally {
      setOpeningId(null);
    }
  };

  const handleApprove = (subId: number) => {
    const raw = marksInput[subId] ?? "";
    const marks = raw.trim() ? parseFloat(raw) : null;
    approveMutation.mutate({ submissionId: subId, marks });
  };

  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Assignment Manager
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--sea-ink)]">
          Submissions: {assignment?.title ?? "Assignment"}
        </h1>
        {assignment && (
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            Due {assignment.due_date} · {assignment.department} · {assignment.batch_start_year}–{assignment.batch_end_year}
            {assignment.section ? ` · Section ${assignment.section}` : ""}
          </p>
        )}
      </div>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-3 gap-4 max-w-xl">
        {[
          { label: "Total", value: String(submissions?.length ?? 0) },
          { label: "Approved", value: String(submissions?.filter((s) => s.is_approved).length ?? 0) },
          { label: "Pending", value: String(submissions?.filter((s) => !s.is_approved).length ?? 0) },
        ].map(({ label, value }) => (
          <div key={label} className="island-shell rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[var(--sea-ink)]">{value}</div>
            <div className="mt-1 text-xs text-[var(--sea-ink-soft)]">{label}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--lagoon)] border-t-transparent" />
        </div>
      ) : !submissions?.length ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--island-bg)] p-12 text-center text-[var(--sea-ink-soft)]">
          <FileText className="mx-auto mb-3 h-10 w-10" />
          <p>No submissions yet.</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {submissions.map((sub) => (
            <div key={sub.id} className="island-shell rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--sea-ink)]">{sub.student_name ?? `Student #${sub.student_id}`}</p>
                  <p className="mt-0.5 text-xs text-[var(--sea-ink-soft)]">
                    Submitted {new Date(sub.submitted_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {sub.is_approved ? (
                    <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle className="h-3 w-3" /> Approved
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      <Clock className="h-3 w-3" /> Pending
                    </span>
                  )}
                  <button
                    onClick={() => handleOpenPdf(sub.id)}
                    disabled={openingId === sub.id}
                    className="flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)] hover:bg-[var(--surface)] disabled:opacity-50"
                  >
                    <FileText className="h-3 w-3" />
                    {openingId === sub.id ? "Opening…" : "Open PDF"}
                  </button>
                  {!sub.is_approved && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={marksInput[sub.id] ?? ""}
                        onChange={(e) =>
                          setMarksInput((p) => ({ ...p, [sub.id]: e.target.value }))
                        }
                        placeholder="Marks"
                        className="w-20 rounded-lg border border-[var(--line)] bg-[var(--island-bg)] px-2 py-1.5 text-xs text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
                      />
                      <button
                        onClick={() => handleApprove(sub.id)}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-3 w-3" /> Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
