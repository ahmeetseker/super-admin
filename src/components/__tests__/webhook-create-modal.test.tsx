// Wave F13.B — WebhookCreateModal vitest cases.
// Drives the URL/event form, validates the HTTPS-only guard, and asserts the
// underlying createEndpoint call persists into the F11 platform-webhooks store.
// F17.B: dropped inline installMemoryStorage shim — shared vitest.setup.ts
// (F13.E) already installs an InMemoryStorage instance before each test. The
// beforeEach below keeps the F11 store reset + baseline seed.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { WebhookCreateModal } from '@/components/tenant/WebhookCreateModal'
import {
  STORAGE_KEY_FOR_TESTS,
  _resetForTests,
  getEndpoints,
} from '@/lib/platform-webhooks'

describe('WebhookCreateModal', () => {
  beforeEach(() => {
    _resetForTests()
    // Seed the F11 store so subsequent createEndpoint calls land on top of
    // a known baseline without first-read mutation noise.
    window.localStorage.setItem(
      STORAGE_KEY_FOR_TESTS,
      JSON.stringify({ endpoints: [], deliveries: {} }),
    )
  })

  afterEach(() => {
    cleanup()
  })

  it('renders default-checked listing events and an auto-generated 32-hex secret', () => {
    render(
      <WebhookCreateModal tenantId="tnt-acme" tenantName="Acme" onClose={() => {}} />,
    )
    const created = screen.getByTestId('webhook-event-listing.created') as HTMLInputElement
    expect(created.checked).toBe(true)
    const secret = screen.getByTestId('webhook-secret-display') as HTMLInputElement
    expect(secret.value).toMatch(/^[0-9a-f]{32}$/)
  })

  it('disables submit until URL is valid HTTPS', () => {
    render(
      <WebhookCreateModal tenantId="tnt-acme" tenantName="Acme" onClose={() => {}} />,
    )
    const submit = screen.getByTestId('webhook-create-submit') as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    fireEvent.change(screen.getByTestId('webhook-url-input'), {
      target: { value: 'http://example.com/hook' },
    })
    expect(submit.disabled).toBe(true)
    fireEvent.change(screen.getByTestId('webhook-url-input'), {
      target: { value: 'https://example.com/hook' },
    })
    expect(submit.disabled).toBe(false)
  })

  it('persists endpoint into platform-webhooks on submit', () => {
    const onClose = vi.fn()
    const onCreated = vi.fn()
    render(
      <WebhookCreateModal
        tenantId="tnt-acme"
        tenantName="Acme"
        onClose={onClose}
        onCreated={onCreated}
      />,
    )
    fireEvent.change(screen.getByTestId('webhook-url-input'), {
      target: { value: 'https://acme.example.com/arsam-hook' },
    })
    fireEvent.click(screen.getByTestId('webhook-create-submit'))

    const all = getEndpoints()
    const fresh = all.find((e) => e.url === 'https://acme.example.com/arsam-hook')
    expect(fresh).toBeDefined()
    expect(fresh!.events.length).toBeGreaterThanOrEqual(1)
    expect(onCreated).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('blocks submit when all events are deselected', () => {
    render(
      <WebhookCreateModal tenantId="tnt-acme" tenantName="Acme" onClose={() => {}} />,
    )
    fireEvent.change(screen.getByTestId('webhook-url-input'), {
      target: { value: 'https://acme.example.com/x' },
    })
    fireEvent.click(screen.getByTestId('webhook-event-listing.created'))
    fireEvent.click(screen.getByTestId('webhook-event-listing.updated'))
    const submit = screen.getByTestId('webhook-create-submit') as HTMLButtonElement
    expect(submit.disabled).toBe(true)
  })
})
