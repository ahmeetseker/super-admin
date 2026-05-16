import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  addAllowEntry,
  cidrSize,
  getTwoFaPolicy,
  ipInCidr,
  isValidCidr,
  listAllowEntries,
  parseCidr,
  removeAllowEntry,
  resetAllowlistForTests,
  setTwoFaPolicy,
} from '@/lib/ip-allowlist'

describe('parseCidr / isValidCidr', () => {
  it('accepts a /32 single host', () => {
    expect(isValidCidr('10.0.0.1')).toBe(true)
    expect(isValidCidr('10.0.0.1/32')).toBe(true)
  })

  it('accepts standard CIDR ranges', () => {
    expect(isValidCidr('192.168.1.0/24')).toBe(true)
    expect(isValidCidr('10.0.0.0/8')).toBe(true)
    expect(isValidCidr('0.0.0.0/0')).toBe(true)
  })

  it('rejects bad octets, masks, and garbage', () => {
    expect(isValidCidr('999.1.1.1')).toBe(false)
    expect(isValidCidr('10.0.0/24')).toBe(false)
    expect(isValidCidr('10.0.0.0/33')).toBe(false)
    expect(isValidCidr('hello')).toBe(false)
    expect(isValidCidr('')).toBe(false)
  })

  it('parseCidr returns ip + mask + maskInt', () => {
    const p = parseCidr('10.0.0.0/24')!
    expect(p.ip).toBe('10.0.0.0')
    expect(p.mask).toBe(24)
    expect(p.maskInt >>> 0).toBe(0xffffff00)
  })
})

describe('ipInCidr', () => {
  it('matches IP inside CIDR range', () => {
    expect(ipInCidr('10.0.0.5', '10.0.0.0/24')).toBe(true)
    expect(ipInCidr('10.0.1.5', '10.0.0.0/24')).toBe(false)
  })

  it('handles /32 single-host CIDR', () => {
    expect(ipInCidr('1.2.3.4', '1.2.3.4/32')).toBe(true)
    expect(ipInCidr('1.2.3.5', '1.2.3.4/32')).toBe(false)
  })

  it('handles /0 catch-all', () => {
    expect(ipInCidr('203.0.113.42', '0.0.0.0/0')).toBe(true)
  })

  it('returns false for invalid input', () => {
    expect(ipInCidr('hello', '10.0.0.0/24')).toBe(false)
    expect(ipInCidr('10.0.0.1', 'garbage')).toBe(false)
  })
})

describe('cidrSize', () => {
  it('returns the host count for a CIDR', () => {
    expect(cidrSize('1.2.3.4/32')).toBe(1)
    expect(cidrSize('10.0.0.0/24')).toBe(256)
    expect(cidrSize('10.0.0.0/0')).toBe(2 ** 32)
  })
})

describe('allowlist store', () => {
  beforeEach(() => {
    resetAllowlistForTests()
  })
  afterEach(() => {
    resetAllowlistForTests()
  })

  it('starts empty', () => {
    expect(listAllowEntries('atolye-ayv')).toEqual([])
  })

  it('addAllowEntry persists per-tenant', () => {
    const e = addAllowEntry({ tenantId: 'atolye-ayv', cidr: '10.0.0.0/24', createdBy: 'ops@arsam' })
    expect(e.cidr).toBe('10.0.0.0/24')
    expect(listAllowEntries('atolye-ayv').length).toBe(1)
    expect(listAllowEntries('cesme-ars').length).toBe(0)
  })

  it('addAllowEntry rejects invalid CIDR', () => {
    expect(() =>
      addAllowEntry({ tenantId: 'atolye-ayv', cidr: 'garbage', createdBy: 'ops@arsam' }),
    ).toThrow()
  })

  it('removeAllowEntry by id', () => {
    const e = addAllowEntry({ tenantId: 'atolye-ayv', cidr: '10.0.0.0/24', createdBy: 'ops' })
    removeAllowEntry(e.id)
    expect(listAllowEntries('atolye-ayv')).toEqual([])
  })
})

describe('2FA policy', () => {
  beforeEach(() => {
    resetAllowlistForTests()
  })
  afterEach(() => {
    resetAllowlistForTests()
  })

  it('starts empty', () => {
    expect(getTwoFaPolicy()).toEqual({})
  })

  it('setTwoFaPolicy upserts per role', () => {
    setTwoFaPolicy('super-admin', true)
    setTwoFaPolicy('readonly-auditor', false)
    const policy = getTwoFaPolicy()
    expect(policy['super-admin']).toBe(true)
    expect(policy['readonly-auditor']).toBe(false)
  })
})
