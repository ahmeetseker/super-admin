# Super Admin (Ops Console)

`arsam.net/ops/*` — platform işletme paneli.

## Komutlar

```bash
pnpm --filter @landx/super-admin run dev           # :5181
pnpm --filter @landx/super-admin run build
pnpm --filter @landx/super-admin run test:e2e
```

## Mimari

- **Vite 8** + **React 19** + **RR7 library mode** + **Tailwind v4** (admin ile identical tooling)
- **Base path:** prod `/ops/`, dev `/`
- **18 route x 4 grup:**
  - **Genel:** Overview, Settings
  - **Müşteriler:** Tenants (+ /tenants/:id detail), Plans
  - **Platform:** Observability, LLM Cost, MCP Tools (A02), Memory Layer (A04), Vector Store (A05), Webhooks, Prompts (A06), Sessions (A11)
  - **Güvenlik:** Audit (+ detail drawer), PII (D02), Permissions (I04), Plugins (K01), Compliance (D03)

## Security

- `X-Robots-Tag: noindex, nofollow`
- Cloudflare WAF + IP allowlist (prod)
- 2FA zorunlu (Faz 11.6'da gerçek)
- Impersonate: 4-eyes audit reason + 15dk session

## Mocks

Tüm mock'lar [`@landx/data`](../../packages/data/) altında `mock/platform/` subdirektorisinde. 16 logical modül.
