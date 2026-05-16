/**
 * Wave 15 / Agent-A74 — exercises the apiOrMock branching for the new
 * super-admin platform hooks (useTenants, useAuditLog).
 *
 * Mirrors packages/data/src/__tests__/listings-api.test.ts so the test
 * patterns stay consistent across the swap fleet (A71/A72/A74).
 *
 * Note: the api client is a module-level singleton, so we reset it between
 * tests by calling configureApi({ baseUrl: '' }) — see the sister test for
 * the full rationale.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createElement } from 'react'

import {
  configureApi,
  isApiConfigured,
  useTenants,
  useAuditLog,
  applyTenantFilters,
  applyAuditFilters,
  TENANTS,
  AUDIT_LOG,
} from '@landx/data'

function resetApiClient() {
  configureApi({ baseUrl: '' })
}

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc, children })
  return { qc, wrapper }
}

describe('platform hooks — apiOrMock branching', () => {
  beforeEach(() => {
    resetApiClient()
  })

  afterEach(() => {
    resetApiClient()
    vi.restoreAllMocks()
  })

  it('useTenants (unconfigured) returns the mock seed sorted by MRR desc', async () => {
    expect(isApiConfigured()).toBe(false)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTenants({}), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    const data = result.current.data!
    expect(data.length).toBe(TENANTS.length)
    // applyTenantFilters sorts by mrr desc — first row should be the seed
    // tenant with the highest MRR (bodrum-em / 19900) per the mock.
    for (let i = 1; i < data.length; i++) {
      expect(data[i - 1]!.mrr >= data[i]!.mrr).toBe(true)
    }
  })

  it('useTenants (configured) hits /platform/tenants and unwraps the envelope', async () => {
    configureApi({ baseUrl: 'http://api.test/v1' })
    const apiPayload = [
      {
        id: 'tnt_api',
        name: 'API Tenant',
        city: 'İstanbul',
        plan: 'Pro' as const,
        mrr: 4900,
        listingCount: 3,
        userCount: 2,
        lastActiveAt: '2026-05-12T00:00:00Z',
        status: 'Aktif' as const,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: apiPayload }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTenants({ plan: 'Pro' }), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())

    // API → domain mapping: lastActiveAt → lastActiveISO, createdAt → createdISO.
    expect(result.current.data).toEqual([
      {
        id: 'tnt_api',
        name: 'API Tenant',
        city: 'İstanbul',
        plan: 'Pro',
        mrr: 4900,
        listingCount: 3,
        userCount: 2,
        lastActiveISO: '2026-05-12T00:00:00Z',
        status: 'Aktif',
        createdISO: '2026-01-01T00:00:00Z',
      },
    ])
    const url = (fetchSpy.mock.calls[0]?.[0] as URL | string).toString()
    expect(url).toContain('/platform/tenants')
    expect(url).toContain('plan=Pro')
  })

  it('useAuditLog (unconfigured) returns mock entries newest-first with null cursor', async () => {
    expect(isApiConfigured()).toBe(false)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAuditLog({}, null), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    const page = result.current.data!
    expect(page.data.length).toBe(AUDIT_LOG.length)
    expect(page.meta.nextCursor).toBeNull()
    // Newest first
    for (let i = 1; i < page.data.length; i++) {
      expect(page.data[i - 1]!.atISO >= page.data[i]!.atISO).toBe(true)
    }
  })

  it('useAuditLog (configured) maps API contract (`at`) to domain (`atISO`) and threads the cursor', async () => {
    configureApi({ baseUrl: 'http://api.test/v1' })
    const apiPayload = [
      {
        id: 'AUD-API-1',
        actor: 'audit-test',
        action: 'tenant.create',
        resourceType: 'tenant',
        resourceId: 'tnt_x',
        tenantId: null,
        ip: '127.0.0.1',
        userAgent: 'test',
        outcome: 'success' as const,
        at: '2026-05-12T10:00:00Z',
      },
    ]
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: apiPayload, meta: { nextCursor: 'cur_2', total: 42 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useAuditLog({ outcome: 'success', tenantId: 'tnt_x' }, 'cur_1'),
      { wrapper },
    )
    await waitFor(() => expect(result.current.data).toBeDefined())

    const page = result.current.data!
    expect(page.data[0]?.atISO).toBe('2026-05-12T10:00:00Z')
    expect(page.meta.nextCursor).toBe('cur_2')
    expect(page.meta.total).toBe(42)

    const url = (fetchSpy.mock.calls[0]?.[0] as URL | string).toString()
    expect(url).toContain('/platform/audit')
    expect(url).toContain('outcome=success')
    expect(url).toContain('tenantId=tnt_x')
    expect(url).toContain('cursor=cur_1')
  })

  it('applyTenantFilters + applyAuditFilters mirror the server-side filter semantics', () => {
    const onlyEnterprise = applyTenantFilters(TENANTS, { plan: 'Enterprise' })
    expect(onlyEnterprise.every((t) => t.plan === 'Enterprise')).toBe(true)
    expect(onlyEnterprise.length).toBeGreaterThan(0)

    const onlyFailure = applyAuditFilters(AUDIT_LOG, { outcome: 'failure' })
    expect(onlyFailure.every((e) => e.outcome === 'failure')).toBe(true)

    const byActor = applyAuditFilters(AUDIT_LOG, { actor: 'system' })
    expect(byActor.every((e) => e.actor.toLowerCase().includes('system'))).toBe(true)
  })
})
