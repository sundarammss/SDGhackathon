import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, AlertCircle, GraduationCap, BookOpen, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useAuthStore, type AuthUser } from "../lib/auth";
import api from "../lib/api";

export const Route = createFileRoute("/login")({ component: LoginPage });

type Portal = "student" | "staff" | "admin";

const PORTAL_CONFIG = {
  student: {
    label: "Student",
    Icon: GraduationCap,
    accent: "#4fb8b2",
    accentHover: "#3da39e",
    ringColor: "rgba(79,184,178,0.4)",
    iconBg: "rgba(79,184,178,0.15)",
    title: "Student Portal",
    desc: "Access your courses, track your progress and connect with peers.",
  },
  staff: {
    label: "Staff",
    Icon: BookOpen,
    accent: "#6366f1",
    accentHover: "#4f46e5",
    ringColor: "rgba(99,102,241,0.4)",
    iconBg: "rgba(99,102,241,0.15)",
    title: "Staff Portal",
    desc: "Monitor student progress, review at-risk alerts and provide academic support.",
  },
  admin: {
    label: "Admin",
    Icon: ShieldCheck,
    accent: "#f59e0b",
    accentHover: "#d97706",
    ringColor: "rgba(245,158,11,0.4)",
    iconBg: "rgba(245,158,11,0.15)",
    title: "Admin Portal",
    desc: "Manage platform settings, oversee all users and configure system behaviour.",
  },
} as const;

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [portal, setPortal] = useState<Portal>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const cfg = PORTAL_CONFIG[portal];

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post<AuthUser>("/api/v1/auth/login", {
        email: loginEmail,
        password: loginPassword,
        portal,
      });
      login(data);
      if (data.role === "admin") {
        navigate({ to: "/admin/dashboard" });
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter an email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    handleLogin(email.trim(), password);
  };

  const switchPortal = (p: Portal) => {
    setPortal(p);
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setError("");
  };

  return (
    <main className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-200"
            style={{ background: cfg.iconBg }}
          >
            <cfg.Icon className="h-8 w-8 transition-colors duration-200" style={{ color: cfg.accent }} />
          </div>
          <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)]">
            Welcome to AI-OS
          </h1>
          <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
            Academic Intelligence Operating System
          </p>
        </div>

        {/* Portal tabs */}
        <div className="mb-4 flex rounded-2xl border border-[var(--line)] bg-[var(--island-bg)] p-1">
          {(["student", "staff", "admin"] as Portal[]).map((p) => {
            const tc = PORTAL_CONFIG[p];
            const active = portal === p;
            return (
              <button
                key={p}
                onClick={() => switchPortal(p)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all duration-150"
                style={
                  active
                    ? { background: tc.accent, color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }
                    : { color: "var(--sea-ink-soft)" }
                }
              >
                <tc.Icon className="h-3.5 w-3.5" />
                {tc.label}
              </button>
            );
          })}
        </div>

        {/* Login card */}
        <div className="island-shell rounded-2xl p-6 sm:p-8">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[var(--sea-ink)]">{cfg.title}</h2>
            <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">{cfg.desc}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-[var(--sea-ink)]"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="you@university.edu"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": cfg.ringColor } as React.CSSProperties}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-[var(--sea-ink)]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-4 py-2.5 pr-11 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": cfg.ringColor } as React.CSSProperties}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: loading ? cfg.accentHover : cfg.accent }}
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? "Signing in…" : `Sign In as ${cfg.label}`}
            </button>
          </form>

        </div>
      </div>
    </main>
  );
}
