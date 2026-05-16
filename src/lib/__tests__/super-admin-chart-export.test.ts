import { describe, expect, it } from 'vitest'
import { toCsv, todayStamp } from '../super-admin-chart-export'

describe('super-admin-chart-export', () => {
  it('toCsv empty rows', () => {
    const csv = toCsv([], [{ key: 'a', label: 'A' }])
    expect(csv).toBe('"A"')
  })

  it('toCsv basic rows', () => {
    const rows = [{ a: 1, b: 2 }, { a: 3, b: 4 }]
    const csv = toCsv(rows, [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ])
    expect(csv).toBe('"A","B"\n"1","2"\n"3","4"')
  })

  it('toCsv escapes quotes', () => {
    const csv = toCsv([{ x: 'he said "hi"' }], [{ key: 'x', label: 'X' }])
    expect(csv).toContain('""hi""')
  })

  it('toCsv handles null/undefined', () => {
    const csv = toCsv([{ a: null, b: undefined }], [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ])
    expect(csv).toBe('"A","B"\n"",""')
  })

  it('toCsv with getValue', () => {
    const rows = [{ price: 100, currency: 'TRY' }]
    const csv = toCsv(rows, [
      { key: 'fmt', label: 'Formatted', getValue: (r) => `${r.price} ${r.currency}` },
    ])
    expect(csv).toBe('"Formatted"\n"100 TRY"')
  })

  it('todayStamp YYYY-MM-DD', () => {
    expect(todayStamp()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
