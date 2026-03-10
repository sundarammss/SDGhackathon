import { HeadContent, Scripts, createRootRoute, useLocation, useNavigate } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { useAuthStore } from '../lib/auth'

import appCss from '../styles.css?url'

const queryClient = new QueryClient()

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

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
})

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
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const isLoginPage = pathname === '/login'
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  const isAdminRoute = pathname.startsWith('/admin')

  useEffect(() => {
    if (!user && !isPublicRoute && !isLoginPage) {
      navigate({ to: '/login' })
    } else if (user && isLoginPage) {
      navigate({ to: user.role === 'admin' ? '/admin/dashboard' : '/dashboard' })
    } else if (user && isAdminRoute && user.role !== 'admin') {
      navigate({ to: '/' })
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
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}
