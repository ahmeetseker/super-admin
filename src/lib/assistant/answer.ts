import type { AiAnswer } from '@landx/ui/shell'

const PATTERNS: Array<{ match: RegExp; build: () => AiAnswer }> = [
  {
    match: /llm.?(cost|maliyet|harcama)/i,
    build: () => ({
      text: 'Geçen ay toplam LLM cost: $1,247 (önceki aya göre +18%). En çok harcayan tenant: Acme Corp ($412).',
      chart: {
        title: 'Aylık LLM cost',
        data: [
          { label: 'Şub', value: 720 },
          { label: 'Mar', value: 890 },
          { label: 'Nis', value: 1056, suffix: '↗' },
          { label: 'May', value: 1247, suffix: '↗' },
        ],
      },
    }),
  },
  {
    match: /yeni.?tenant|new.?tenant/i,
    build: () => ({
      text: 'Bu hafta 3 yeni tenant onboard oldu. Toplam aktif tenant: 47.',
      chart: {
        title: 'Haftalık yeni tenant',
        data: [
          { label: 'H-3', value: 1 },
          { label: 'H-2', value: 2 },
          { label: 'H-1', value: 4 },
          { label: 'Bu hafta', value: 3 },
        ],
      },
    }),
  },
  {
    match: /(hata|error).?oran|hata.?yüzde/i,
    build: () => ({
      text: 'Son 24 saatte hata oranı %0.42 — geçen haftaya göre stabil. En çok hata: vector-store endpoint.',
      chart: {
        title: 'Saatlik hata oranı (%)',
        data: [
          { label: '00', value: 0.31 },
          { label: '06', value: 0.28 },
          { label: '12', value: 0.55, suffix: '↗' },
          { label: '18', value: 0.42 },
        ],
      },
    }),
  },
  {
    match: /(feature.?flag|aktif.?flag)/i,
    build: () => ({
      text: '12 feature flag aktif. Son 7 günde 2 yeni flag eklendi, 1 tanesi production rollout aşamasında.',
    }),
  },
]

export function opsAnswer(query: string): AiAnswer {
  for (const { match, build } of PATTERNS) {
    if (match.test(query)) return build()
  }
  return {
    text: `"${query}" için doğrudan eşleşen kayıt bulunamadı. LLM cost, tenant, hata oranı veya feature flag deneyebilirsin.`,
  }
}
