# Super-admin E2E Tests (Playwright)

## Local çalıştırma

İlk seferde browser binary'leri kur:

```bash
pnpm exec playwright install chromium
```

Sonra:

```bash
pnpm --filter @landx/super-admin run test:e2e         # headless run
pnpm --filter @landx/super-admin run test:e2e:ui      # interactive UI mode
```

Pre-test build otomatik (`pretest:e2e`).

## CI

CI'da `playwright install --with-deps chromium` çalıştırılmalı sonra `pnpm test:e2e`.

## Webserver stratejisi

`playwright.config.ts` `webServer` config'i `pnpm run preview --port 4175 --strictPort` ile vite preview server'ı spawn eder. Preview server ancak `pnpm build` sonrası `dist/` üzerinden çalışır — bu yüzden `pretest:e2e` scripti otomatik build çalıştırır.

`reuseExistingServer: !process.env.CI` — local'de zaten 4175'te bir preview varsa onu kullanır; CI'da her seferinde fresh server spawn'lar.

## Port allocation (Wave-6)

- atolye-admin → 4173
- public-site → 4174
- super-admin → 4175 (bu app)

## Test dosyaları

- `01-overview.spec.ts` — / overview eyebrow + KPI cards
- `02-tenants.spec.ts` — tenant list table, plan filter (Pro)
- `03-nav.spec.ts` — 14 route'a direct visit (main visible + status 200)
- `04-audit.spec.ts` — audit table render + Detay expand
