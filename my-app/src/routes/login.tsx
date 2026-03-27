import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type CSSProperties, type FormEvent } from "react";
import {
  AlertCircle,
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore, type AuthUser } from "../lib/auth";
import api from "../lib/api";

export const Route = createFileRoute("/login")({ component: LoginPage });

type Portal = "student" | "staff" | "admin";

type PortalConfig = {
  label: string;
  Icon: typeof GraduationCap;
  accent: string;
  accentHover: string;
  ringColor: string;
  title: string;
  desc: string;
};

const PORTAL_CONFIG: Record<Portal, PortalConfig> = {
  student: {
    label: "Student",
    Icon: GraduationCap,
    accent: "#4fb8b2",
    accentHover: "#3da39e",
    ringColor: "rgba(79,184,178,0.4)",
    title: "Student Portal",
    desc: "Access your courses, track your progress and connect with peers.",
  },
  staff: {
    label: "Staff",
    Icon: BookOpen,
    accent: "#6366f1",
    accentHover: "#4f46e5",
    ringColor: "rgba(99,102,241,0.4)",
    title: "Staff Portal",
    desc: "Monitor student progress, review alerts and provide academic support.",
  },
  admin: {
    label: "Admin",
    Icon: ShieldCheck,
    accent: "#f59e0b",
    accentHover: "#d97706",
    ringColor: "rgba(245,158,11,0.4)",
    title: "Admin Portal",
    desc: "Manage platform settings and oversee system operations.",
  },
};

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

  const inputRingStyle = { "--tw-ring-color": cfg.ringColor } as CSSProperties;

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
      navigate({ to: data.role === "admin" ? "/admin/dashboard" : "/dashboard" });
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
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

  const switchPortal = (nextPortal: Portal) => {
    setPortal(nextPortal);
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setError("");
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <section className="w-full rounded-2xl border border-[rgba(198,198,205,0.28)] bg-surface-container-lowest p-6 shadow-[0_16px_48px_rgba(25,28,30,0.1)] sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <img src="/image.png" alt="Application logo" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <h1 className="font-headline text-xl font-bold text-on-surface">Learning Platform</h1>
              <p className="text-xs font-medium text-on-surface-variant">Sign in to continue</p>
            </div>
          </div>

          <div className="mb-5 flex rounded-2xl border border-outline-variant bg-surface-container-low p-1">
            {(["student", "staff", "admin"] as Portal[]).map((p) => {
              const tc = PORTAL_CONFIG[p];
              const active = portal === p;
              return (
                <button
                  key={p}
                  onClick={() => switchPortal(p)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all"
                  style={
                    active
                      ? { background: tc.accent, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.14)" }
                      : { color: "var(--color-on-surface-variant)" }
                  }
                >
                  <tc.Icon className="h-3.5 w-3.5" />
                  {tc.label}
                </button>
              );
            })}
          </div>

          <div className="mb-5">
            <h2 className="text-xl font-bold text-on-surface">{cfg.title}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{cfg.desc}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-semibold text-on-surface">
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
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2"
                style={inputRingStyle}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-semibold text-on-surface">
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
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 pr-11 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2"
                  style={inputRingStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-2.5 text-sm text-on-error-container">
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
              {loading ? "Signing in..." : `Sign In as ${cfg.label}`}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
