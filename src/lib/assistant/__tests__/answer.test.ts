import { describe, it, expect } from 'vitest'
import { opsAnswer } from '../answer'

describe('super-admin ops AI answer', () => {
  it('LLM cost sorusuna chart ile cevap döner', () => {
    const result = opsAnswer('Geçen ay LLM cost ne kadar?')
    expect(result.text).toMatch(/llm|maliyet|cost/i)
    expect(result.chart).toBeDefined()
  })

  it('tenant sorusuna sayısal cevap döner', () => {
    const result = opsAnswer('Bu hafta yeni tenant')
    expect(result.text).toMatch(/tenant/i)
  })

  it('eşleşme yoksa generic cevap döner', () => {
    const result = opsAnswer('asdf qwer')
    expect(result.text).toMatch(/bulun|sonuç/i)
  })

  it('hata oranı sorusuna observability cevabı', () => {
    const result = opsAnswer('Son 24h hata oranı')
    expect(result.text).toMatch(/hata|error|oran/i)
  })
})
