import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, AlertCircle, CheckCircle } from "lucide-react";
import api from "../../lib/api";
import { useAuthStore } from "../../lib/auth";

export const Route = createFileRoute("/admin/students/$studentId")({
  component: AdminStudentProfile,
});

interface StudentDetail {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  section: string | null;
  batch_start_year: number | null;
  batch_end_year: number | null;
  created_at: string;
}

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  disabled,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(245,158,11,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}

function AdminStudentProfile() {
  const { studentId } = Route.useParams();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [form, setForm] = useState<Omit<StudentDetail, "id" | "created_at">>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    department: "",
    section: "",
    batch_start_year: null,
    batch_end_year: null,
  });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate({ to: "/" });
      return;
    }
    api
      .get<StudentDetail>(`/api/v1/students/${studentId}`)
      .then(({ data }) => {
        setStudent(data);
        setForm({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone ?? "",
          department: data.department ?? "",
          section: data.section ?? "",
          batch_start_year: data.batch_start_year,
          batch_end_year: data.batch_end_year,
        });
      })
      .catch(() => setError("Failed to load student."))
      .finally(() => setLoading(false));
  }, [studentId, user, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First name and last name are required.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.patch<StudentDetail>(
        `/api/v1/students/${studentId}`,
        {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone?.trim() || null,
          department: form.department?.trim() || null,
          section: form.section?.trim() || null,
          batch_start_year: form.batch_start_year || null,
          batch_end_year: form.batch_end_year || null,
        }
      );
      setStudent(data);
      setForm({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone ?? "",
        department: data.department ?? "",
        section: data.section ?? "",
        batch_start_year: data.batch_start_year,
        batch_end_year: data.batch_end_year,
      });
      setEditMode(false);
      setSuccess("Student profile updated successfully.");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? "Failed to update student. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-wrap px-4 pb-12 pt-10">
      {/* Back */}
      <Link
        to="/admin/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#f59e0b]" />
        </div>
      ) : error && !student ? (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      ) : student ? (
        <div className="mx-auto max-w-xl">
          {/* Profile header */}
          <div className="island-shell mb-6 flex items-center gap-4 rounded-2xl p-6">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[rgba(79,184,178,0.12)] text-xl font-bold text-[#4fb8b2]">
              {student.first_name[0]}
              {student.last_name[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--sea-ink)]">
                {student.first_name} {student.last_name}
              </h1>
              <p className="text-sm text-[var(--sea-ink-soft)]">
                Student #{student.id} &nbsp;·&nbsp; Joined{" "}
                {new Date(student.created_at).toLocaleDateString()}
              </p>
            </div>
            {!editMode && (
              <button
                onClick={() => {
                  setEditMode(true);
                  setSuccess("");
                  setError("");
                }}
                className="ml-auto flex items-center gap-1.5 rounded-xl bg-[rgba(245,158,11,0.1)] px-4 py-2 text-sm font-semibold text-[#f59e0b] transition hover:bg-[rgba(245,158,11,0.2)]"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Alerts */}
          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="island-shell rounded-2xl p-6">
            <h2 className="mb-5 text-base font-bold text-[var(--sea-ink)]">
              {editMode ? "Edit Details" : "Student Details"}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="First Name"
                  name="first_name"
                  value={form.first_name}
                  onChange={(v) => setForm((f) => ({ ...f, first_name: v }))}
                  disabled={!editMode}
                />
                <Field
                  label="Last Name"
                  name="last_name"
                  value={form.last_name}
                  onChange={(v) => setForm((f) => ({ ...f, last_name: v }))}
                  disabled={!editMode}
                />
              </div>
              <Field
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                disabled={!editMode}
              />
              <Field
                label="Phone"
                name="phone"
                type="tel"
                value={form.phone ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                disabled={!editMode}
              />
              <Field
                label="Department"
                name="department"
                value={form.department ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, department: v }))}
                disabled={!editMode}
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Section"
                  name="section"
                  value={form.section ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, section: v }))}
                  disabled={!editMode}
                />
                <div />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Batch Start Year"
                  name="batch_start_year"
                  type="number"
                  value={String(form.batch_start_year ?? "")}
                  onChange={(v) => setForm((f) => ({ ...f, batch_start_year: v ? parseInt(v) : null }))}
                  disabled={!editMode}
                />
                <Field
                  label="Batch End Year"
                  name="batch_end_year"
                  type="number"
                  value={String(form.batch_end_year ?? "")}
                  onChange={(v) => setForm((f) => ({ ...f, batch_end_year: v ? parseInt(v) : null }))}
                  disabled={!editMode}
                />
              </div>
            </div>

            {editMode && (
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[#f59e0b] px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#d97706] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false);
                    setError("");
                    setForm({
                      first_name: student.first_name,
                      last_name: student.last_name,
                      email: student.email,
                      phone: student.phone ?? "",
                      department: student.department ?? "",
                      section: student.section ?? "",
                      batch_start_year: student.batch_start_year ?? null,
                      batch_end_year: student.batch_end_year ?? null,
                    });
                  }}
                  className="rounded-xl border border-[var(--line)] px-5 py-2.5 text-sm font-medium text-[var(--sea-ink)] transition hover:bg-[var(--island-bg)]"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
      ) : null}
    </main>
  );
}
