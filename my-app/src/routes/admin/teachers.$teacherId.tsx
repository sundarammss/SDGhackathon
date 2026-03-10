import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, AlertCircle, CheckCircle } from "lucide-react";
import api from "../../lib/api";
import { useAuthStore } from "../../lib/auth";

export const Route = createFileRoute("/admin/teachers/$teacherId")({
  component: AdminTeacherProfile,
});

interface TeacherDetail {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  department: string | null;
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
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}

function AdminTeacherProfile() {
  const { teacherId } = Route.useParams();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [form, setForm] = useState<Omit<TeacherDetail, "id" | "created_at">>({
    first_name: "",
    last_name: "",
    email: "",
    department: "",
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
      .get<TeacherDetail>(`/api/v1/teachers/${teacherId}`)
      .then(({ data }) => {
        setTeacher(data);
        setForm({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          department: data.department ?? "",
        });
      })
      .catch(() => setError("Failed to load teacher."))
      .finally(() => setLoading(false));
  }, [teacherId, user, navigate]);

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
      const { data } = await api.patch<TeacherDetail>(
        `/api/v1/teachers/${teacherId}`,
        {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          department: form.department?.trim() || null,
        }
      );
      setTeacher(data);
      setForm({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        department: data.department ?? "",
      });
      setEditMode(false);
      setSuccess("Teacher profile updated successfully.");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? "Failed to update teacher. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-wrap px-4 pb-12 pt-10">
      <Link
        to="/admin/teachers"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Teachers
      </Link>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#6366f1]" />
        </div>
      ) : error && !teacher ? (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      ) : teacher ? (
        <div className="mx-auto max-w-xl">
          {/* Profile header */}
          <div className="island-shell mb-6 flex items-center gap-4 rounded-2xl p-6">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[rgba(99,102,241,0.12)] text-xl font-bold text-[#6366f1]">
              {teacher.first_name[0]}
              {teacher.last_name[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--sea-ink)]">
                {teacher.first_name} {teacher.last_name}
              </h1>
              <p className="text-sm text-[var(--sea-ink-soft)]">
                Staff #{teacher.id} &nbsp;·&nbsp; Joined{" "}
                {new Date(teacher.created_at).toLocaleDateString()}
              </p>
              {teacher.department && (
                <span className="mt-1 inline-block rounded-lg bg-[rgba(99,102,241,0.12)] px-2.5 py-0.5 text-xs font-semibold text-[#6366f1]">
                  {teacher.department}
                </span>
              )}
            </div>
            {!editMode && (
              <button
                onClick={() => {
                  setEditMode(true);
                  setSuccess("");
                  setError("");
                }}
                className="ml-auto flex items-center gap-1.5 rounded-xl bg-[rgba(99,102,241,0.1)] px-4 py-2 text-sm font-semibold text-[#6366f1] transition hover:bg-[rgba(99,102,241,0.2)]"
              >
                Edit Profile
              </button>
            )}
          </div>

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

          <form onSubmit={handleSave} className="island-shell rounded-2xl p-6">
            <h2 className="mb-5 text-base font-bold text-[var(--sea-ink)]">
              {editMode ? "Edit Details" : "Teacher Details"}
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
                label="Department"
                name="department"
                value={form.department ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, department: v }))}
                disabled={!editMode}
              />
            </div>

            {editMode && (
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[#6366f1] px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false);
                    setError("");
                    setForm({
                      first_name: teacher.first_name,
                      last_name: teacher.last_name,
                      email: teacher.email,
                      department: teacher.department ?? "",
                    });
                  }}
                  className="rounded-xl border border-[var(--line)] px-5 py-2.5 text-sm font-medium text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
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
