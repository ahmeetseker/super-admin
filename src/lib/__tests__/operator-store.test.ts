import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createOperator,
  deleteOperator,
  get2faCoverage,
  getOperator,
  getOperators,
  getRoleLabel,
  reactivateOperator,
  resendInvite,
  resetOperatorsForTests,
  suspendOperator,
  updateOperator,
} from '@/lib/operator-store'

describe('operator-store', () => {
  beforeEach(() => {
    resetOperatorsForTests()
  })
  afterEach(() => {
    resetOperatorsForTests()
  })

  it('seeds from ROLES.members on first read', () => {
    const ops = getOperators()
    expect(ops.length).toBeGreaterThan(0)
    for (const op of ops) {
      expect(op.email).toMatch(/@/)
      expect(['super-admin', 'support', 'billing-ops', 'compliance', 'readonly-auditor']).toContain(op.roleId)
    }
  })

  it('createOperator appends an invited record with derived name', () => {
    const before = getOperators().length
    const op = createOperator({ email: 'mert.demir@arsam.local', roleId: 'support' })
    expect(op.status).toBe('invited')
    expect(op.name).toBe('Mert Demir')
    expect(op.twofaEnrolled).toBe(false)
    expect(getOperators().length).toBe(before + 1)
  })

  it('createOperator rejects duplicate emails (case-insensitive)', () => {
    createOperator({ email: 'dup@arsam.local', roleId: 'support' })
    expect(() => createOperator({ email: 'DUP@arsam.local', roleId: 'support' })).toThrow()
  })

  it('updateOperator merges patch and returns next record', () => {
    const op = createOperator({ email: 'patch@arsam.local', roleId: 'support' })
    const next = updateOperator(op.id, { roleId: 'compliance', twofaEnrolled: true })
    expect(next?.roleId).toBe('compliance')
    expect(next?.twofaEnrolled).toBe(true)
    expect(getOperator(op.id)?.roleId).toBe('compliance')
  })

  it('suspend → reactivate flips status', () => {
    const op = createOperator({ email: 's@arsam.local', roleId: 'support' })
    expect(suspendOperator(op.id)?.status).toBe('suspended')
    expect(reactivateOperator(op.id)?.status).toBe('active')
  })

  it('deleteOperator removes the record', () => {
    const op = createOperator({ email: 'gone@arsam.local', roleId: 'support' })
    deleteOperator(op.id)
    expect(getOperator(op.id)).toBeNull()
  })

  it('resendInvite refreshes createdISO for invited operators', async () => {
    const op = createOperator({ email: 'invite@arsam.local', roleId: 'support' })
    const stamp = op.createdISO
    await new Promise((r) => setTimeout(r, 5))
    const refreshed = resendInvite(op.id)
    expect(refreshed?.createdISO).not.toBe(stamp)
  })

  it('getRoleLabel returns TR label or fallback id', () => {
    expect(getRoleLabel('super-admin')).toBe('Süper Admin')
    expect(getRoleLabel('compliance')).toMatch(/uyum|compliance/i)
  })

  it('get2faCoverage reports enrolled + missing + rate', () => {
    const c = get2faCoverage()
    expect(c.enrolled + c.missing).toBe(getOperators().length)
    expect(c.rate).toBeGreaterThanOrEqual(0)
    expect(c.rate).toBeLessThanOrEqual(100)
  })
})
