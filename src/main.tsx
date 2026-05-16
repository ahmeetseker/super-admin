import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { initSentry, captureException } from '@landx/ui/lib'
import { ErrorBoundary } from '@landx/ui/feedback'
import { queryClient } from '@landx/data'

import { AuthProvider } from '@/auth/AuthProvider'
import { RootLayout } from '@/routes/root'

// Wave F25.A — Sentry init. DSN comes from VITE_SENTRY_DSN; in dev / CI /
// preview the helper falls back to console.error so call sites stay uniform.
void initSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN ?? null,
  environment: import.meta.env.MODE === 'production' ? 'production' : 'development',
  release: 'f25',
})

const Overview = lazy(() => import('@/routes/overview').then((m) => ({ default: m.Overview })))
const Tenants = lazy(() => import('@/routes/tenants').then((m) => ({ default: m.Tenants })))
const TenantNew = lazy(() => import('@/routes/tenant-new').then((m) => ({ default: m.TenantNew })))
const TenantDetail = lazy(() => import('@/routes/tenant-detail').then((m) => ({ default: m.TenantDetail })))
const Plans = lazy(() => import('@/routes/plans').then((m) => ({ default: m.Plans })))
const Payments = lazy(() => import('@/routes/payments').then((m) => ({ default: m.Payments })))
const Refunds = lazy(() => import('@/routes/refunds').then((m) => ({ default: m.Refunds })))
const Observability = lazy(() => import('@/routes/observability').then((m) => ({ default: m.Observability })))
const LlmCost = lazy(() => import('@/routes/llm-cost').then((m) => ({ default: m.LlmCost })))
const Plugins = lazy(() => import('@/routes/plugins').then((m) => ({ default: m.Plugins })))
const Audit = lazy(() => import('@/routes/audit').then((m) => ({ default: m.Audit })))
const Pii = lazy(() => import('@/routes/pii').then((m) => ({ default: m.Pii })))
const Permissions = lazy(() => import('@/routes/permissions').then((m) => ({ default: m.Permissions })))
const Compliance = lazy(() => import('@/routes/compliance').then((m) => ({ default: m.Compliance })))
const PlatformSettings = lazy(() =>
  import('@/routes/settings').then((m) => ({ default: m.PlatformSettings })),
)
const McpTools = lazy(() => import('@/routes/mcp-tools').then((m) => ({ default: m.McpTools })))
const MemoryLayer = lazy(() => import('@/routes/memory-layer').then((m) => ({ default: m.MemoryLayer })))
const VectorStore = lazy(() => import('@/routes/vector-store').then((m) => ({ default: m.VectorStore })))
const Webhooks = lazy(() => import('@/routes/webhooks').then((m) => ({ default: m.Webhooks })))
const Prompts = lazy(() => import('@/routes/prompts').then((m) => ({ default: m.Prompts })))
const Sessions = lazy(() => import('@/routes/sessions').then((m) => ({ default: m.Sessions })))
const WebVitalsRoute = lazy(() => import('@/routes/web-vitals').then((m) => ({ default: m.WebVitals })))
const Revenue = lazy(() => import('@/routes/revenue').then((m) => ({ default: m.Revenue })))
const Cohorts = lazy(() => import('@/routes/cohorts').then((m) => ({ default: m.Cohorts })))
const Operators = lazy(() => import('@/routes/operators').then((m) => ({ default: m.Operators })))
const SecurityRoute = lazy(() => import('@/routes/security').then((m) => ({ default: m.Security })))
const DataRights = lazy(() => import('@/routes/data-rights').then((m) => ({ default: m.DataRights })))
const FeatureFlagsRoute = lazy(() => import('@/routes/feature-flags').then((m) => ({ default: m.FeatureFlagsRoute })))
const I18nRoute = lazy(() => import('@/routes/i18n').then((m) => ({ default: m.I18nRoute })))
const ExperimentsRoute = lazy(() => import('@/routes/experiments').then((m) => ({ default: m.ExperimentsRoute })))
const Offline = lazy(() => import('@/routes/offline').then((m) => ({ default: m.Offline })))
const Approvals = lazy(() => import('@/routes/approvals').then((m) => ({ default: m.Approvals })))
const Rules = lazy(() => import('@/routes/rules').then((m) => ({ default: m.Rules })))
const Reports = lazy(() => import('@/routes/reports').then((m) => ({ default: m.Reports })))
const Tkgm = lazy(() => import('@/routes/tkgm').then((m) => ({ default: m.Tkgm })))
const ModerationQueue = lazy(() => import('@/routes/moderation-queue').then((m) => ({ default: m.ModerationQueue })))
const DisputesAdmin = lazy(() => import('@/routes/disputes-admin').then((m) => ({ default: m.DisputesAdmin })))
const KycReview = lazy(() => import('@/routes/kyc-review').then((m) => ({ default: m.KycReview })))
const ApiExplorer = lazy(() => import('@/routes/api-explorer').then((m) => ({ default: m.ApiExplorer })))
const AgentMemory = lazy(() => import('@/routes/agent-memory').then((m) => ({ default: m.AgentMemory })))
const SloBudget = lazy(() => import('@/routes/slo-budget').then((m) => ({ default: m.SloBudget })))
const AuditChain = lazy(() => import('@/routes/audit-chain').then((m) => ({ default: m.AuditChain })))
const Orchestration = lazy(() => import('@/routes/orchestration').then((m) => ({ default: m.Orchestration })))
const ModulesCatalog = lazy(() =>
  import('@/routes/modules-catalog').then((m) => ({ default: m.ModulesCatalog })),
)

import './index.css'

function RouteFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">yükleniyor</span>
      </div>
    </div>
  )
}

const lazyRoute = (Component: React.ComponentType) => (
  <Suspense fallback={<RouteFallback />}>
    <Component />
  </Suspense>
)

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootLayout />,
      children: [
        { index: true, element: lazyRoute(Overview) },
        { path: 'tenants', element: lazyRoute(Tenants) },
        { path: 'tenants/new', element: lazyRoute(TenantNew) },
        { path: 'tenants/:id', element: lazyRoute(TenantDetail) },
        { path: 'plans', element: lazyRoute(Plans) },
        { path: 'payments', element: lazyRoute(Payments) },
        { path: 'refunds', element: lazyRoute(Refunds) },
        { path: 'revenue', element: lazyRoute(Revenue) },
        { path: 'cohorts', element: lazyRoute(Cohorts) },
        { path: 'operators', element: lazyRoute(Operators) },
        { path: 'security', element: lazyRoute(SecurityRoute) },
        { path: 'data-rights', element: lazyRoute(DataRights) },
        { path: 'feature-flags', element: lazyRoute(FeatureFlagsRoute) },
        { path: 'i18n', element: lazyRoute(I18nRoute) },
        { path: 'experiments', element: lazyRoute(ExperimentsRoute) },
        { path: 'observability', element: lazyRoute(Observability) },
        { path: 'llm-cost', element: lazyRoute(LlmCost) },
        { path: 'plugins', element: lazyRoute(Plugins) },
        { path: 'audit', element: lazyRoute(Audit) },
        { path: 'pii', element: lazyRoute(Pii) },
        { path: 'permissions', element: lazyRoute(Permissions) },
        { path: 'compliance', element: lazyRoute(Compliance) },
        { path: 'settings', element: lazyRoute(PlatformSettings) },
        { path: 'mcp-tools', element: lazyRoute(McpTools) },
        { path: 'memory-layer', element: lazyRoute(MemoryLayer) },
        { path: 'vector-store', element: lazyRoute(VectorStore) },
        { path: 'webhooks', element: lazyRoute(Webhooks) },
        { path: 'prompts', element: lazyRoute(Prompts) },
        { path: 'sessions', element: lazyRoute(Sessions) },
        { path: 'web-vitals', element: lazyRoute(WebVitalsRoute) },
        { path: 'offline', element: lazyRoute(Offline) },
        { path: 'approvals', element: lazyRoute(Approvals) },
        { path: 'rules', element: lazyRoute(Rules) },
        { path: 'reports', element: lazyRoute(Reports) },
        { path: 'tkgm', element: lazyRoute(Tkgm) },
        { path: 'moderation-queue', element: lazyRoute(ModerationQueue) },
        { path: 'disputes-admin', element: lazyRoute(DisputesAdmin) },
        { path: 'kyc-review', element: lazyRoute(KycReview) },
        { path: 'endpoints', element: lazyRoute(ApiExplorer) },
        { path: 'agent-memory', element: lazyRoute(AgentMemory) },
        { path: 'slo-budget', element: lazyRoute(SloBudget) },
        { path: 'audit-chain', element: lazyRoute(AuditChain) },
        { path: 'orchestration', element: lazyRoute(Orchestration) },
        { path: 'modules-catalog', element: lazyRoute(ModulesCatalog) },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
)

const rootEl = document.getElementById('root')!
createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary onError={(error) => captureException(error)}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
