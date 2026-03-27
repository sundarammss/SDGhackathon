import { Link } from '@tanstack/react-router'
import {
  BookOpen,
  CheckSquare,
  Cpu,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react'
import { useAuthStore } from '../lib/auth'

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)

  const navBaseClass =
    'flex items-center gap-3 px-4 py-3 rounded-full text-on-surface-variant font-semibold text-sm hover:bg-surface-container transition-colors'
  const navActiveClass = 'bg-secondary-container text-on-secondary-fixed font-bold'

  return (
    <aside className="relative z-50 flex h-full w-72 flex-col border-r border-[rgba(198,198,205,0.25)] bg-surface-container-low px-5 py-6 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <div className="mb-8 flex items-center gap-3 px-2">
        <Link to="/" className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm transition-opacity hover:opacity-90">
          <img src="/image.png" alt="Application logo" className="h-10 w-10 object-contain" />
        </Link>
        <div>
          <h1 className="font-headline text-lg font-bold leading-tight text-on-surface">Learning Platform</h1>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Intelligence Curator</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col space-y-1 overflow-y-auto pb-4 pr-1">
        {user && (
          <>
            {user.role === 'admin' ? (
              <>
                <Link to="/admin/dashboard" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                  <LayoutDashboard className="h-4 w-4" />
                  Students
                </Link>
                <Link to="/admin/teachers" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                  <Users className="h-4 w-4" />
                  Teachers
                </Link>
              </>
            ) : (
              <>
                {user.role !== 'student' && (
                  <Link to="/dashboard" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                )}

                {user.role === 'advisor' && (
                  <Link to="/portal" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                    <Settings className="h-4 w-4" />
                    Portal
                  </Link>
                )}

                {user.role === 'student' && (
                  <>
                    <Link to="/dashboard" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link to="/competitions" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                      <Trophy className="h-4 w-4" />
                      Competitions
                    </Link>
                    <Link to="/forum" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                      <Users className="h-4 w-4" />
                      Forum
                    </Link>
                    <Link to="/resources" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                      <BookOpen className="h-4 w-4" />
                      Resources
                    </Link>
                  </>
                )}

                {user.role !== 'advisor' && (
                  <Link to="/tasks" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                    <CheckSquare className="h-4 w-4" />
                    Tasks
                  </Link>
                )}

                <Link to="/peers" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                  <UserPlus className="h-4 w-4" />
                  Peer Match
                </Link>

                {user.role === 'student' && (
                  <Link to="/chat" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </Link>
                )}

                <Link to="/simulator" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                  <Cpu className="h-4 w-4" />
                  Simulator
                </Link>
              </>
            )}
          </>
        )}
      </nav>

      <div className="mt-auto border-t border-[rgba(198,198,205,0.25)] pb-1 pl-1 pr-2 pt-5">
        {!user && (
          <Link
            to="/login"
            className="mt-1 inline-flex rounded-full bg-secondary-container px-4 py-1.5 text-xs font-bold text-on-secondary-container no-underline transition hover:opacity-90"
          >
            Sign In
          </Link>
        )}
      </div>
    </aside>
  )
}