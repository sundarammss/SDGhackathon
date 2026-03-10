import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '../lib/auth'
import {
  Brain,
  BarChart3,
  FlaskConical,
  Users,
  Shield,
  HeartPulse,
} from 'lucide-react'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const user = useAuthStore((s) => s.user)

  const dashboardTo = user?.role === 'admin' ? '/admin/dashboard' : user ? '/dashboard' : '/login'
  const dashboardLabel = user ? 'Go to Dashboard' : 'Get Started'

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">Academic Intelligence Operating System</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Predict student risk<br />weeks before it happens.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          AI-OS shifts institutions from reactive grading to a proactive success
          ecosystem — powered by Academic Digital Twins, explainable AI, and
          intelligent interventions.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to={dashboardTo}
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
          >
            {dashboardLabel}
          </Link>
          {!user && (
            <Link
              to="/login"
              className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
            >
              Sign In
            </Link>
          )}
          {user && (
            <Link
              to="/simulator"
              className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
            >
              Try What-If Simulator
            </Link>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: <Brain className="h-6 w-6 text-[#4fb8b2]" />,
            title: 'Academic Digital Twin',
            desc: 'Multi-modal student representation combining LMS activity, assessments, and engagement signals into a dynamic health score.',
          },
          {
            icon: <BarChart3 className="h-6 w-6 text-[#4fb8b2]" />,
            title: 'Predictive Intelligence',
            desc: 'Hybrid ensemble model with SHAP-based explanations so advisors understand the "why" behind every risk flag.',
          },
          {
            icon: <HeartPulse className="h-6 w-6 text-[#4fb8b2]" />,
            title: 'Burnout Filter',
            desc: 'Distinguishes disengagement, conceptual confusion, and cognitive overload for targeted interventions.',
          },
          {
            icon: <FlaskConical className="h-6 w-6 text-[#4fb8b2]" />,
            title: 'What-If Simulator',
            desc: 'Students test counterfactual scenarios to see how behaviour changes shift their predicted trajectory.',
          },
          {
            icon: <Users className="h-6 w-6 text-[#4fb8b2]" />,
            title: 'Peer Synergy Matching',
            desc: 'Algorithmic pairing of complementary students for study groups based on skills and schedules.',
          },
          {
            icon: <Shield className="h-6 w-6 text-[#4fb8b2]" />,
            title: 'Privacy-First RBAC',
            desc: 'Role-based access control with federated-learning-ready architecture — personal data stays local.',
          },
        ].map(({ icon, title, desc }, index) => (
          <article
            key={title}
            className="island-shell feature-card rise-in rounded-2xl p-5"
            style={{ animationDelay: `${index * 90 + 80}ms` }}
          >
            <div className="mb-3">{icon}</div>
            <h2 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">
              {title}
            </h2>
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{desc}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
