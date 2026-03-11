import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { useAuthStore } from '../lib/auth'

export default function Header() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return (
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
                <Link
                  to="/admin/dashboard"
                  className="nav-link"
                  activeProps={{ className: 'nav-link is-active' }}
                >
                  Students
                </Link>
                <Link
                  to="/admin/teachers"
                  className="nav-link"
                  activeProps={{ className: 'nav-link is-active' }}
                >
                  Teachers
                </Link>
              </>
            ) : (
              <>
                {user.role !== 'student' && (
                  <Link
                    to="/dashboard"
                    className="nav-link"
                    activeProps={{ className: 'nav-link is-active' }}
                  >
                    Dashboard
                  </Link>
                )}
                {user.role === 'advisor' && (
                  <Link
                    to="/portal"
                    className="nav-link"
                    activeProps={{ className: 'nav-link is-active' }}
                  >
                    Portal
                  </Link>
                )}
                {user.role === 'student' && (
                  <Link
                    to="/dashboard"
                    className="nav-link"
                    activeProps={{ className: 'nav-link is-active' }}
                  >
                    My Dashboard
                  </Link>
                )}
                <Link
                  to="/simulator"
                  className="nav-link"
                  activeProps={{ className: 'nav-link is-active' }}
                >
                  What-If Simulator
                </Link>
                <Link
                  to="/forum"
                  className="nav-link"
                  activeProps={{ className: 'nav-link is-active' }}
                >
                  Forum
                </Link>
                <Link
                  to="/quizzes"
                  className="nav-link"
                  activeProps={{ className: 'nav-link is-active' }}
                >
                  Quizzes
                </Link>
                <Link
                  to="/peers"
                  className="nav-link"
                  activeProps={{ className: 'nav-link is-active' }}
                >
                  Peer Match
                </Link>
                {user.role === 'student' && (
                  <Link
                    to="/chat"
                    className="nav-link"
                    activeProps={{ className: 'nav-link is-active' }}
                  >
                    Chat
                  </Link>
                )}
              </>
            )}
          </div>
        )}

        {/* Right-side actions — always pushed to far right */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden rounded-lg bg-[rgba(79,184,178,0.12)] px-2.5 py-1 text-xs font-semibold capitalize text-[#4fb8b2] sm:inline-block">
                {user.role}
              </span>
              <span className="hidden text-sm font-medium text-[var(--sea-ink)] sm:inline-block">
                {user.name}
              </span>
              <button
                onClick={() => { logout(); navigate({ to: '/login' }) }}
                title="Sign out"
                className="rounded-xl p-2 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-red-500"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
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
  )
}
