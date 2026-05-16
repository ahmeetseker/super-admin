// Tests for lib/platform-webhooks.ts.
// Covers seed migration, CRUD, pause/resume, rotateSecret, deliveries, edges.
// F13.E: in-memory localStorage shim moved to apps/super-admin/vitest.setup.ts.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  STORAGE_KEY_FOR_TESTS,
  _resetForTests,
  createEndpoint,
  deleteEndpoint,
  generateSecret,
  getDeliveries,
  getEndpoint,
  getEndpoints,
  getEndpointTotals,
  isValidWebhookUrl,
  pauseEndpoint,
  resumeEndpoint,
  rotateSecret,
  statusCodeTone,
  updateEndpoint,
} from '@/lib/platform-webhooks'

describe('platform-webhooks', () => {
  beforeEach(() => {
    _resetForTests()
  })

  it('first load migrates @landx/data seed into localStorage', () => {
    const list = getEndpoints()
    expect(list.length).toBeGreaterThanOrEqual(5)
    // All seeded endpoints have a 32-char lowercase hex secret.
    for (const ep of list) {
      expect(ep.secret).toMatch(/^[0-9a-f]{32}$/)
    }
    // localStorage now owns the data (subsequent reads do not depend on seed).
    const raw = window.localStorage.getItem(STORAGE_KEY_FOR_TESTS)
    expect(raw).toBeTruthy()
  })

  it('createEndpoint inserts a new endpoint with generated secret + 30 deliveries', () => {
    const created = createEndpoint({
      url: 'https://example.com/hook',
      events: ['listing.created', 'listing.updated'],
      description: 'Test hook',
    })
    expect(created.id).toMatch(/^whk-/)
    expect(created.secret).toMatch(/^[0-9a-f]{32}$/)
    expect(created.status).toBe('active')
    expect(created.failureCount).toBe(0)
    expect(getEndpoint(created.id)).toEqual(created)
    expect(getDeliveries(created.id)).toHaveLength(30)
  })

  it('createEndpoint dedupes events and trims url/description', () => {
    const created = createEndpoint({
      url: '  https://example.com/hook  ',
      events: ['listing.created', 'listing.created', 'listing.updated'],
      description: '  trim me  ',
    })
    expect(created.url).toBe('https://example.com/hook')
    expect(created.description).toBe('trim me')
    expect(created.events).toEqual(['listing.created', 'listing.updated'])
  })

  it('updateEndpoint patches url/events/description', () => {
    const ep = createEndpoint({
      url: 'https://example.com/hook',
      events: ['listing.created'],
    })
    const updated = updateEndpoint(ep.id, {
      url: 'https://example.com/hook2',
      events: ['user.created', 'user.deleted'],
      description: 'updated',
    })
    expect(updated).not.toBeNull()
    expect(updated!.url).toBe('https://example.com/hook2')
    expect(updated!.events).toEqual(['user.created', 'user.deleted'])
    expect(updated!.description).toBe('updated')
  })

  it('updateEndpoint returns null for unknown id', () => {
    expect(updateEndpoint('does-not-exist', { url: 'https://x.example.com/' })).toBeNull()
  })

  it('deleteEndpoint removes endpoint + its deliveries', () => {
    const ep = createEndpoint({
      url: 'https://example.com/hook',
      events: ['listing.created'],
    })
    expect(getDeliveries(ep.id)).toHaveLength(30)
    expect(deleteEndpoint(ep.id)).toBe(true)
    expect(getEndpoint(ep.id)).toBeNull()
    expect(getDeliveries(ep.id)).toEqual([])
    // Idempotent — second delete returns false.
    expect(deleteEndpoint(ep.id)).toBe(false)
  })

  it('pauseEndpoint / resumeEndpoint toggles status', () => {
    const ep = createEndpoint({
      url: 'https://example.com/hook',
      events: ['listing.created'],
    })
    expect(ep.status).toBe('active')
    const paused = pauseEndpoint(ep.id)
    expect(paused!.status).toBe('paused')
    const resumed = resumeEndpoint(ep.id)
    expect(resumed!.status).toBe('active')
  })

  it('rotateSecret replaces secret with a fresh 32-char hex', () => {
    const ep = createEndpoint({
      url: 'https://example.com/hook',
      events: ['listing.created'],
    })
    const before = ep.secret
    const rotated = rotateSecret(ep.id)
    expect(rotated).not.toBeNull()
    expect(rotated!.secret).toMatch(/^[0-9a-f]{32}$/)
    expect(rotated!.secret).not.toBe(before)
  })

  it('getDeliveries returns deterministic son-30 list per endpoint', () => {
    // Seed migration ensures whk-001 exists.
    const list1 = getDeliveries('whk-001')
    const list2 = getDeliveries('whk-001')
    expect(list1).toHaveLength(30)
    expect(list2).toHaveLength(30)
    // Deterministic — same call produces equal arrays.
    expect(list2[0]).toEqual(list1[0])
    expect(list2[29]).toEqual(list1[29])
  })

  it('getEndpointTotals counts by status', () => {
    const totals = getEndpointTotals()
    expect(totals.total).toBeGreaterThanOrEqual(5)
    expect(totals.active + totals.paused + totals.failing).toBe(totals.total)
  })

  it('malformed storage falls back to seed migration', () => {
    window.localStorage.setItem(STORAGE_KEY_FOR_TESTS, '!!! not json !!!')
    const list = getEndpoints()
    expect(list.length).toBeGreaterThanOrEqual(5)
  })

  it('empty endpoints object — create then list', () => {
    // Manually overwrite store with valid-but-empty shape.
    window.localStorage.setItem(
      STORAGE_KEY_FOR_TESTS,
      JSON.stringify({ endpoints: [], deliveries: {} }),
    )
    expect(getEndpoints()).toEqual([])
    const fresh = createEndpoint({
      url: 'https://example.com/hook',
      events: ['listing.created'],
    })
    expect(getEndpoints()).toHaveLength(1)
    expect(getEndpoints()[0].id).toBe(fresh.id)
  })

  it('endpoint id dedupe — last-write-wins on read', () => {
    const ep = createEndpoint({
      url: 'https://example.com/hook',
      events: ['listing.created'],
    })
    // Manually inject a duplicate id into storage.
    const raw = window.localStorage.getItem(STORAGE_KEY_FOR_TESTS)!
    const parsed = JSON.parse(raw)
    parsed.endpoints.push({
      ...ep,
      url: 'https://example.com/dup',
    })
    window.localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(parsed))
    const list = getEndpoints().filter((e) => e.id === ep.id)
    expect(list).toHaveLength(1)
    expect(list[0].url).toBe('https://example.com/dup')
  })

  it('generateSecret returns a 32-char lowercase hex string', () => {
    const s1 = generateSecret()
    const s2 = generateSecret()
    expect(s1).toMatch(/^[0-9a-f]{32}$/)
    expect(s2).toMatch(/^[0-9a-f]{32}$/)
    expect(s1).not.toBe(s2)
  })

  it('isValidWebhookUrl requires https://', () => {
    expect(isValidWebhookUrl('https://example.com/x')).toBe(true)
    expect(isValidWebhookUrl('http://example.com/x')).toBe(false)
    expect(isValidWebhookUrl('not a url')).toBe(false)
    expect(isValidWebhookUrl('')).toBe(false)
  })

  it('statusCodeTone classifies HTTP codes', () => {
    expect(statusCodeTone(200)).toBe('success')
    expect(statusCodeTone(404)).toBe('warn')
    expect(statusCodeTone(500)).toBe('error')
    expect(statusCodeTone(0)).toBe('neutral')
  })
})
