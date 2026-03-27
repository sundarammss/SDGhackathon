import { HeadContent, Link, Scripts, createRootRoute, useLocation, useNavigate } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Bell, ChevronDown, ClipboardList, EllipsisVertical, Eye, EyeOff, FileText, Flame, Lock, MessageSquare, Settings, Trophy, User, UserPlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Footer from '../components/Footer'
import Sidebar from '../components/Sidebar'
import { useAuthStore, type AuthUser } from '../lib/auth'
import { useStudentNotifications } from '../lib/hooks'
import type { StudentNotificationOut } from '../lib/api'
import api from '../lib/api'

import appCss from '../styles.css?url'

const queryClient = new QueryClient()

const THEME_INIT_SCRIPT = `(function(){try{var root=document.documentElement;root.classList.remove('dark');root.classList.add('light');root.setAttribute('data-theme','light');root.style.colorScheme='light';window.localStorage.setItem('theme','light');}catch(e){}})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'AI-OS — Academic Intelligence Operating System',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[40vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-6 inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
        Go to home
      </Link>
    </main>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        <QueryClientProvider client={queryClient}>
        <AuthGate>
        {children}
        </AuthGate>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}

// Routes accessible without authentication
const PUBLIC_ROUTES = ['/', '/about']

/**
 * Wraps the app content.
 * - '/', '/about' are public — shown with header/footer even when logged out.
 * - '/login' is shown without header/footer.
 * - All other routes require authentication; unauthenticated users are sent to /login.
 * - After login, users are redirected to their role-specific page.
 * - Non-admins cannot access /admin/* routes.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const isLoginPage = pathname === '/login' || pathname.startsWith('/login/')
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  const isAdminRoute = pathname.startsWith('/admin')

  useEffect(() => {
    if (!user && !isPublicRoute && !isLoginPage) {
      navigate({ to: '/login', replace: true })
    } else if (user && isLoginPage) {
      navigate({ to: user.role === 'admin' ? '/admin/dashboard' : '/dashboard', replace: true })
    } else if (user && isAdminRoute && user.role !== 'admin') {
      navigate({ to: '/', replace: true })
    }
  }, [user, isPublicRoute, isLoginPage, isAdminRoute, navigate])

  // Login page: no header/footer
  if (isLoginPage) {
    return <>{children}</>
  }

  // Protected route, not yet authenticated — blank while redirect fires
  if (!user && !isPublicRoute) {
    return null
  }

  // Non-admin on an admin route — blank while redirect fires
  if (isAdminRoute && user?.role !== 'admin') {
    return null
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-base)] text-[var(--sea-ink)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        {user && <TopRightActions />}
        {children}
        {pathname === '/' && <Footer />}
      </main>
    </div>
  )

  function TopRightActions() {
    const [openProfile, setOpenProfile] = useState(false)
    const [openNotifications, setOpenNotifications] = useState(false)
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [showPwdModal, setShowPwdModal] = useState(false)
    const profileRef = useRef<HTMLDivElement>(null)
    const notificationsRef = useRef<HTMLDivElement>(null)
    const {
      data: notifications,
      isLoading: notificationsLoading,
    } = useStudentNotifications(user?.role === 'student')
    const { data: streakData } = useQuery({
      queryKey: ['dashboard', 'my-streak', user?.id],
      queryFn: async () => {
        const { data } = await api.get<{ current_streak: number }>('/api/v1/dashboard/my-streak')
        return data
      },
      enabled: !!user && user.role === 'student',
      staleTime: 10_000,
    })

    useEffect(() => {
      if (!openProfile && !openNotifications) return
      function handleClick(e: MouseEvent) {
        const target = e.target as Node
        if (profileRef.current && !profileRef.current.contains(target)) {
          setOpenProfile(false)
        }
        if (notificationsRef.current && !notificationsRef.current.contains(target)) {
          setOpenNotifications(false)
        }
      }
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }, [openProfile, openNotifications])

    const notificationList = notifications ?? []
    const importantNotifications = notificationList.slice(0, 2)
    const moreNotifications = notificationList.slice(2)
    const unreadCount = notificationList.length

    const initials =
      user?.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('') || 'U'

    return (
      <div className="pointer-events-none relative z-40 flex w-full justify-end px-4 pt-4 sm:px-6">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-transparent px-2 py-2">
          {user?.role === 'student' && (
            <div className="ml-1 inline-flex w-fit items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600">
              <Flame className="h-3.5 w-3.5" />
              <span>{streakData?.current_streak ?? 0} day streak</span>
            </div>
          )}

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenNotifications((v) => !v)
                setOpenProfile(false)
              }}
              className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(198,198,205,0.3)] text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface"
              aria-label="Open notifications"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {openNotifications && (
              <div className="absolute right-0 top-[3.6rem] z-50 w-[22rem] overflow-hidden rounded-2xl border border-[rgba(198,198,205,0.35)] bg-surface-container-lowest text-on-surface shadow-[0_24px_50px_rgba(25,28,30,0.22)] sm:w-[30rem]">
                <div className="flex items-center justify-between border-b border-surface-container-high px-4 py-3">
                  <p className="text-xl font-semibold text-on-surface">Notifications</p>
                  <button
                    type="button"
                    className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface"
                    title="Notification settings"
                    aria-label="Notification settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-[68vh] overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="px-4 py-6 text-sm text-on-surface-variant">Loading notifications...</div>
                  ) : notificationList.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-on-surface-variant">No notifications right now.</div>
                  ) : (
                    <>
                      <div className="px-4 py-3 text-[1.05rem] font-medium text-on-surface">Important</div>
                      {importantNotifications.map((n) => (
                        <NotificationRow key={n.id} notification={n} onOpen={() => setOpenNotifications(false)} />
                      ))}

                      {moreNotifications.length > 0 && (
                        <>
                          <div className="mt-1 border-t border-surface-container-high px-4 py-3 text-[1.05rem] font-medium text-on-surface">More notifications</div>
                          {moreNotifications.map((n) => (
                            <NotificationRow key={n.id} notification={n} onOpen={() => setOpenNotifications(false)} />
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenProfile((v) => !v)
                setOpenNotifications(false)
              }}
              className="flex items-center gap-2 rounded-full border border-transparent pr-2 transition hover:border-[rgba(198,198,205,0.4)]"
              aria-label="Open profile menu"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-secondary-container to-primary-fixed text-sm font-bold text-on-secondary-container">
                {initials}
              </div>
              <ChevronDown className="h-4 w-4 text-on-surface-variant" />
            </button>

            {openProfile && (
              <div className="absolute right-0 top-[3.6rem] min-w-[220px] overflow-hidden rounded-2xl border border-[rgba(198,198,205,0.35)] bg-surface-container-lowest shadow-[0_18px_40px_rgba(25,28,30,0.15)]">
                <div className="px-4 py-3">
                  <p className="text-sm font-bold text-on-surface">{user?.name}</p>
                  <p className="text-xs text-on-surface-variant">{user?.email}</p>
                </div>
                <div className="h-px bg-surface-container-high" />
                <button
                  type="button"
                  onClick={() => {
                    setOpenProfile(false)
                    setShowProfileModal(true)
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
                >
                  <User className="h-4 w-4" />
                  View Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenProfile(false)
                    setShowPwdModal(true)
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
                >
                  <Lock className="h-4 w-4" />
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenProfile(false)
                    logout()
                    // Clear persisted auth and hard redirect so no app-shell state survives.
                    window.localStorage.removeItem('aios-auth')
                    window.location.assign('/login')
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm font-semibold text-error transition hover:bg-error-container"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {user && showProfileModal && (
          <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />
        )}
        {showPwdModal && <ChangePasswordModal onClose={() => setShowPwdModal(false)} />}
      </div>
    )
  }
}

function NotificationRow({ notification, onOpen }: { notification: StudentNotificationOut; onOpen: () => void }) {
  const navigate = useNavigate()

  function openNotification() {
    onOpen()
    navigate({ to: notification.action_path as never })
  }

  return (
    <button
      type="button"
      onClick={openNotification}
      className="group flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-container-low"
    >
      <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <MessageSquare className="h-4 w-4" />
        <span className="absolute -left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-sky-400" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[0.97rem] leading-6 text-on-surface">{notification.title}: {notification.message}</p>
        <p className="mt-1 text-sm text-on-surface-variant">{formatNotificationTime(notification.created_at)}</p>
      </div>

      <div className="mt-0.5 flex items-start gap-1.5">
        <div className="hidden h-[52px] w-[92px] flex-shrink-0 overflow-hidden rounded-md border border-surface-container-high bg-surface-container-low sm:block">
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-container to-surface-container-low text-on-surface-variant">
            {notificationPreviewIcon(notification.event_type)}
          </div>
        </div>
        <span className="rounded-full p-1.5 text-on-surface-variant transition group-hover:bg-surface-container-high group-hover:text-on-surface">
          <EllipsisVertical className="h-4 w-4" />
        </span>
      </div>
    </button>
  )
}

function notificationPreviewIcon(eventType: string) {
  if (eventType === 'quiz_assigned') return <ClipboardList className="h-5 w-5" />
  if (eventType === 'assignment_assigned') return <FileText className="h-5 w-5" />
  if (eventType === 'chat_message') return <MessageSquare className="h-5 w-5" />
  if (eventType === 'peer_request') return <UserPlus className="h-5 w-5" />
  if (eventType === 'competition_approved') return <Trophy className="h-5 w-5" />
  return <Bell className="h-5 w-5" />
}

function formatNotificationTime(iso: string): string {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return ''

  const diffMs = Date.now() - dt.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} minutes ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hours ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay} days ago`
  return dt.toLocaleDateString()
}

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

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  student: { bg: 'rgba(245,158,11,0.16)', color: '#f59e0b' },
  advisor: { bg: 'rgba(79,184,178,0.16)', color: '#4fb8b2' },
  admin: { bg: 'rgba(99,102,241,0.16)', color: '#6366f1' },
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

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

function ProfileModal({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const s = ROLE_STYLE[user.role] ?? ROLE_STYLE.student

  useEffect(() => {
    api
      .get<ProfileData>('/api/v1/auth/me')
      .then(({ data }) => setProfile(data))
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
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
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--sea-ink)]">My Profile</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--sea-ink-soft)] transition hover:bg-[var(--island-bg)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <Avatar name={user.name} role={user.role} size="xl" />
          <div className="min-w-0">
            <p className="text-xl font-bold text-[var(--sea-ink)]">{user.name}</p>
            <p className="truncate text-xs text-[var(--sea-ink-soft)]">{user.email}</p>
            <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
              {roleLabel}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#4fb8b2]" />
            <span className="ml-2 text-sm text-[var(--sea-ink-soft)]">Loading...</span>
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-500">{error}</p>
        ) : profile ? (
          <div className="grid grid-cols-2 gap-3">
            {profile.department && <Field label="Department" value={profile.department} />}
            <Field label="Email" value={profile.email} wide />
            {profile.phone && <Field label="Phone" value={profile.phone} />}
            {profile.section && <Field label="Section" value={`Section ${profile.section}`} />}
            {profile.batch_start_year && profile.batch_end_year && <Field label="Batch" value={`${profile.batch_start_year} - ${profile.batch_end_year}`} />}
            {memberSince && <Field label="Member Since" value={memberSince} />}
          </div>
        ) : null}
      </div>
    </div>
  )
}

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPwd !== confirmPwd) {
      setError('New passwords do not match.')
      return
    }
    if (newPwd.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
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
          <div className="rounded-xl bg-emerald-50 p-5 text-center">
            <div className="mb-2 text-2xl">OK</div>
            <p className="font-semibold text-emerald-700">Password updated successfully!</p>
            <button onClick={onClose} className="mt-4 rounded-xl bg-[rgba(79,184,178,0.15)] px-5 py-2 text-sm font-semibold text-[#4fb8b2] transition hover:bg-[rgba(79,184,178,0.25)]">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Confirm New Password</label>
              <div className="relative">
                <input
                  required
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Re-enter new password"
                  className={`w-full rounded-xl border bg-[var(--island-bg)] px-3 py-2 pr-9 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 transition ${
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
              {confirmMatch && <p className="text-xs font-medium text-emerald-500">Passwords match</p>}
              {confirmMismatch && <p className="text-xs font-medium text-red-500">Passwords do not match</p>}
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink-soft)] transition hover:bg-[var(--island-bg)]">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || confirmMismatch}
                className="rounded-xl bg-[rgba(79,184,178,0.15)] px-5 py-2 text-sm font-semibold text-[#4fb8b2] transition hover:bg-[rgba(79,184,178,0.25)] disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
