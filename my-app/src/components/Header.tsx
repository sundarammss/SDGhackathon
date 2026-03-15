import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut, User, Lock, X, Eye, EyeOff, Flame } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { useAuthStore, type AuthUser } from '../lib/auth'
import { useState, useRef, useEffect } from 'react'
import api from '../lib/api'
import { useQuery } from '@tanstack/react-query'

/* ── Types ─────────────────────────────────────────────────────────── */

interface ProfileData {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string | null
  department: string | null
  section: string | null
  batch_start_year: number | null
  batch_end_year: number | null
  created_at: string | null
  role: string
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  student: { bg: 'rgba(245,158,11,0.16)', color: '#f59e0b' },
  advisor: { bg: 'rgba(79,184,178,0.16)', color: '#4fb8b2' },
  admin:   { bg: 'rgba(99,102,241,0.16)', color: '#6366f1' },
}

/* ── Avatar ─────────────────────────────────────────────────────────── */

function Avatar({ name, role, size = 'md' }: { name: string; role: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const s = ROLE_STYLE[role] ?? ROLE_STYLE.student
  const cls = size === 'xl' ? 'h-16 w-16 text-xl' : size === 'lg' ? 'h-11 w-11 text-base' : size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm'
  return (
    <div
      className={`${cls} flex flex-shrink-0 select-none items-center justify-center rounded-full font-bold`}
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {getInitials(name)}
    </div>
  )
}

/* ── Profile Modal ──────────────────────────────────────────────────── */

function ProfileModal({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const s = ROLE_STYLE[user.role] ?? ROLE_STYLE.student

  useEffect(() => {
    api.get<ProfileData>('/api/v1/auth/me')
      .then(({ data }) => setProfile(data))
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function Field({ label, value, wide }: { label: string; value: string | number | null | undefined; wide?: boolean }) {
    if (value == null || value === '') return null
    return (
      <div className={`flex flex-col gap-0.5 rounded-xl border border-[var(--line)] px-3 py-2.5${wide ? ' col-span-2' : ''}`}>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">{label}</span>
        <span className="truncate text-sm font-medium text-[var(--sea-ink)]">{value}</span>
      </div>
    )
  }

  const roleLabel = user.role === 'advisor' ? 'Teacher' : user.role.charAt(0).toUpperCase() + user.role.slice(1)
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
    : null

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        className="island-shell w-full max-w-md overflow-y-auto rounded-2xl p-6 shadow-2xl"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--sea-ink)]">My Profile</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--sea-ink-soft)] transition hover:bg-[var(--island-bg)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={user.name} role={user.role} size="xl" />
          <div className="min-w-0">
            <p className="text-xl font-bold text-[var(--sea-ink)]">{user.name}</p>
            <p className="truncate text-xs text-[var(--sea-ink-soft)]">{user.email}</p>
            <span
              className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: s.bg, color: s.color }}
            >
              {roleLabel}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#4fb8b2]" />
            <span className="ml-2 text-sm text-[var(--sea-ink-soft)]">Loading…</span>
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-500 dark:bg-red-900/20">{error}</p>
        ) : profile ? (
          <div className="grid grid-cols-2 gap-3">
            {profile.department && <Field label="Department" value={profile.department} />}
            <Field label="Email" value={profile.email} wide />
            {profile.phone && <Field label="Phone" value={profile.phone} />}
            {profile.section && <Field label="Section" value={`Section ${profile.section}`} />}
            {profile.batch_start_year && profile.batch_end_year && (
              <Field label="Batch" value={`${profile.batch_start_year} – ${profile.batch_end_year}`} />
            )}
            {memberSince && <Field label="Member Since" value={memberSince} />}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ── Change Password Modal ──────────────────────────────────────────── */

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPwd !== confirmPwd) { setError('New passwords do not match.'); return }
    if (newPwd.length < 6) { setError('New password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      await api.post('/api/v1/auth/change-password', { current_password: currentPwd, new_password: newPwd })
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Incorrect current password.')
    } finally {
      setLoading(false)
    }
  }

  const confirmMatch = confirmPwd.length > 0 && confirmPwd === newPwd
  const confirmMismatch = confirmPwd.length > 0 && confirmPwd !== newPwd

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        className="island-shell w-full max-w-sm overflow-y-auto rounded-2xl p-6 shadow-2xl"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-[#4fb8b2]" />
            <h2 className="text-lg font-bold text-[var(--sea-ink)]">Change Password</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--sea-ink-soft)] transition hover:bg-[var(--island-bg)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="rounded-xl bg-emerald-50 p-5 text-center dark:bg-emerald-900/20">
            <div className="mb-2 text-2xl">✓</div>
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">Password updated successfully!</p>
            <button onClick={onClose} className="mt-4 rounded-xl bg-[rgba(79,184,178,0.15)] px-5 py-2 text-sm font-semibold text-[#4fb8b2] transition hover:bg-[rgba(79,184,178,0.25)]">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Current Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Current Password</label>
              <div className="relative">
                <input
                  required
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 pr-9 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
                />
                <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">New Password</label>
              <div className="relative">
                <input
                  required
                  type={showNew ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-2 pr-9 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
                />
                <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Confirm New Password</label>
              <div className="relative">
                <input
                  required
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Re-enter new password"
                  className={`w-full rounded-xl border px-3 py-2 pr-9 text-sm bg-[var(--island-bg)] text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 transition ${
                    confirmMatch
                      ? 'border-emerald-400 focus:ring-[rgba(52,211,153,0.4)]'
                      : confirmMismatch
                      ? 'border-red-400 focus:ring-[rgba(239,68,68,0.4)]'
                      : 'border-[var(--line)] focus:ring-[rgba(79,184,178,0.4)]'
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmMatch && <p className="text-xs font-medium text-emerald-500">✓ Passwords match</p>}
              {confirmMismatch && <p className="text-xs font-medium text-red-500">Passwords do not match</p>}
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink-soft)] transition hover:bg-[var(--island-bg)]">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || confirmMismatch}
                className="rounded-xl bg-[rgba(79,184,178,0.15)] px-5 py-2 text-sm font-semibold text-[#4fb8b2] transition hover:bg-[rgba(79,184,178,0.25)] disabled:opacity-50"
              >
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/* ── Profile Menu (avatar + dropdown) ───────────────────────────────── */

function ProfileMenu({
  user,
  onLogout,
  onShowProfile,
  onShowPwd,
}: {
  user: AuthUser
  onLogout: () => void
  onShowProfile: () => void
  onShowPwd: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const s = ROLE_STYLE[user.role] ?? ROLE_STYLE.student
  const roleLabel = user.role === 'advisor' ? 'Teacher' : user.role.charAt(0).toUpperCase() + user.role.slice(1)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={user.name}
        className="flex items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{ '--tw-ring-color': s.color } as React.CSSProperties}
      >
        <Avatar name={user.name} role={user.role} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--island-bg)] shadow-2xl">
          {/* User info header */}
          <div className="flex items-center gap-3 px-4 py-4">
            <Avatar name={user.name} role={user.role} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--sea-ink)]">{user.name}</p>
              <p className="truncate text-xs text-[var(--sea-ink-soft)]">{user.email}</p>
              <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="border-t border-[var(--line)]" />

          <div className="py-1">
            <button
              onClick={() => { setOpen(false); onShowProfile() }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--sea-ink)] transition hover:bg-[rgba(79,184,178,0.08)]"
            >
              <User className="h-4 w-4 text-[var(--sea-ink-soft)]" />
              View Profile
            </button>
            <button
              onClick={() => { setOpen(false); onShowPwd() }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--sea-ink)] transition hover:bg-[rgba(79,184,178,0.08)]"
            >
              <Lock className="h-4 w-4 text-[var(--sea-ink-soft)]" />
              Change Password
            </button>
          </div>

          <div className="border-t border-[var(--line)]" />

          <div className="py-1">
            <button
              onClick={() => { setOpen(false); onLogout() }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Header ─────────────────────────────────────────────────────────── */

export default function Header() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [showProfile, setShowProfile] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const { data: streakData } = useQuery({
    queryKey: ['dashboard', 'my-streak', user?.id],
    queryFn: async () => {
      const { data } = await api.get<{ current_streak: number }>('/api/v1/dashboard/my-streak')
      return data
    },
    enabled: !!user && user.role === 'student',
    staleTime: 10_000,
  })

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
          >
            <span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
            AI-OS
          </Link>
        </h2>

        {/* Nav links — hidden for guests */}
        {user && (
          <div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:order-2 sm:w-auto sm:flex-nowrap sm:pb-0">
            {user.role === 'admin' ? (
              <>
                <Link to="/admin/dashboard" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>
                  Students
                </Link>
                <Link to="/admin/teachers" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>
                  Teachers
                </Link>
              </>
            ) : (
              <>
                {user.role !== 'student' && (
                  <Link to="/dashboard" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>
                    Dashboard
                  </Link>
                )}
                {user.role === 'advisor' && (
                  <Link to="/portal" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>
                    Portal
                  </Link>
                )}
                {user.role === 'student' && (
                  <Link to="/dashboard" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>
                    My Dashboard
                  </Link>
                )}
                {user.role === 'student' && (
                  <Link to="/competitions" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>
                    Competitions
                  </Link>
                )}
                {user.role === 'student' && (
                  <Link to="/forum" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>
                    Forum
                  </Link>
                )}
                {user.role === 'student' && (
                  <Link to="/resources" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>
                    Study Resources
                  </Link>
                )}
                {user.role !== 'advisor' && (
                  <Link to="/tasks" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>
                    Tasks
                  </Link>
                )}
                <Link to="/peers" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>
                  Peer Match
                </Link>
                {user.role === 'student' && (
                  <Link to="/chat" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>
                    Chat
                  </Link>
                )}
                <Link to="/simulator" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>
                  What-If Simulator
                </Link>
              </>
            )}
          </div>
        )}

        {/* Right-side actions */}
        <div className="order-1 ml-auto flex items-center gap-2 sm:order-3">
          <ThemeToggle />
          {user ? (
            <>
              {user.role === 'student' && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.14)] px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-300">
                  <Flame className="h-3.5 w-3.5" />
                  <span>{streakData?.current_streak ?? 0} day streak</span>
                </div>
              )}
              <ProfileMenu
                user={user}
                onLogout={() => { logout(); navigate({ to: '/login' }) }}
                onShowProfile={() => setShowProfile(true)}
                onShowPwd={() => setShowPwd(true)}
              />
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-3.5 py-1.5 text-xs font-semibold text-[var(--lagoon-deep)] no-underline transition hover:bg-[rgba(79,184,178,0.24)]"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </header>

    {/* Modals rendered outside <header> so backdrop-filter doesn't trap fixed positioning */}
    {user && showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
    {user && showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
    </>
  )
}
