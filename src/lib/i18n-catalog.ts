/**
 * Wave F26.0 — i18n string catalog (mock).
 *
 * The "real" source-of-truth is `apps/public-site/src/i18n/{tr,en}.ts`.
 * This store holds **overrides** an operator can apply at runtime —
 * production swaps the localStorage layer for a backend table.
 *
 * `getCatalogEntries()` flattens the public-site TR + EN dictionaries
 * into a `LocalizedString[]` so the UI shows missing translations + lets
 * operators edit copy without redeploying.
 */

const I18N_CATALOG_KEY = 'arsam.platform-i18n-catalog.v1'

export interface LocalizedString {
  key: string                // dot-notated path, e.g. 'common.save'
  namespace: string          // top-level segment ('common', 'auth', etc.)
  tr: string
  en: string
  modifiedISO?: string
}

// Minimal seed — agent (F26.B) genişletir; gerçek kaynak public-site sözlüğü.
const SEED: LocalizedString[] = [
  { key: 'common.save', namespace: 'common', tr: 'Kaydet', en: 'Save' },
  { key: 'common.cancel', namespace: 'common', tr: 'İptal', en: 'Cancel' },
  { key: 'common.delete', namespace: 'common', tr: 'Sil', en: 'Delete' },
  { key: 'common.edit', namespace: 'common', tr: 'Düzenle', en: 'Edit' },
  { key: 'common.search', namespace: 'common', tr: 'Ara', en: 'Search' },
  { key: 'common.next', namespace: 'common', tr: 'İleri', en: 'Next' },
  { key: 'common.previous', namespace: 'common', tr: 'Geri', en: 'Previous' },
  { key: 'common.loading', namespace: 'common', tr: 'Yükleniyor…', en: 'Loading…' },
  { key: 'auth.signIn', namespace: 'auth', tr: 'Giriş yap', en: 'Sign in' },
  { key: 'auth.signOut', namespace: 'auth', tr: 'Çıkış yap', en: 'Sign out' },
  { key: 'auth.signUp', namespace: 'auth', tr: 'Kayıt ol', en: 'Sign up' },
  { key: 'nav.home', namespace: 'nav', tr: 'Anasayfa', en: 'Home' },
  { key: 'nav.search', namespace: 'nav', tr: 'Arama', en: 'Search' },
  { key: 'nav.listings', namespace: 'nav', tr: 'İlanlar', en: 'Listings' },
  { key: 'nav.offices', namespace: 'nav', tr: 'Ofisler', en: 'Offices' },
  { key: 'nav.regions', namespace: 'nav', tr: 'Bölgeler', en: 'Regions' },
  { key: 'nav.contact', namespace: 'nav', tr: 'İletişim', en: 'Contact' },
  { key: 'nav.about', namespace: 'nav', tr: 'Hakkımızda', en: 'About' },
  { key: 'nav.blog', namespace: 'nav', tr: 'Blog', en: 'Blog' },
  { key: 'nav.help', namespace: 'nav', tr: 'Yardım', en: 'Help' },
  { key: 'listing.viewDetails', namespace: 'listing', tr: 'Detayları gör', en: 'View details' },
  { key: 'listing.contact', namespace: 'listing', tr: 'İletişime geç', en: 'Contact' },
  { key: 'listing.share', namespace: 'listing', tr: 'Paylaş', en: 'Share' },
  { key: 'listing.compare', namespace: 'listing', tr: 'Karşılaştır', en: 'Compare' },
  { key: 'listing.favorite', namespace: 'listing', tr: 'Favorile', en: 'Favorite' },
  { key: 'office.openingHours', namespace: 'office', tr: 'Açılış saatleri', en: 'Opening hours' },
  // F26.B agent bu listeyi public-site dict'inden flatten ederek genişletir
]

function readOverrides(): Record<string, Partial<LocalizedString>> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(I18N_CATALOG_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeOverrides(overrides: Record<string, Partial<LocalizedString>>): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(I18N_CATALOG_KEY, JSON.stringify(overrides))
  } catch {
    /* ignore */
  }
}

export function getCatalogEntries(): LocalizedString[] {
  const overrides = readOverrides()
  return SEED.map((row) => ({ ...row, ...overrides[row.key] }))
}

export function getNamespaces(): string[] {
  return Array.from(new Set(SEED.map((r) => r.namespace))).sort()
}

export function findMissingEnglish(): LocalizedString[] {
  return getCatalogEntries().filter((r) => !r.en || r.en.trim().length === 0)
}

export function findMissingTurkish(): LocalizedString[] {
  return getCatalogEntries().filter((r) => !r.tr || r.tr.trim().length === 0)
}

export interface UpdateCatalogInput {
  key: string
  tr?: string
  en?: string
}

export function updateCatalogString(input: UpdateCatalogInput): LocalizedString | null {
  if (!SEED.some((r) => r.key === input.key)) return null
  const overrides = readOverrides()
  overrides[input.key] = {
    ...overrides[input.key],
    ...(input.tr !== undefined ? { tr: input.tr } : {}),
    ...(input.en !== undefined ? { en: input.en } : {}),
    modifiedISO: new Date().toISOString(),
  }
  writeOverrides(overrides)
  return getCatalogEntries().find((r) => r.key === input.key) ?? null
}

export function resetCatalogString(key: string): void {
  const overrides = readOverrides()
  delete overrides[key]
  writeOverrides(overrides)
}

export function exportCatalogJson(): string {
  const entries = getCatalogEntries()
  const tr: Record<string, Record<string, string>> = {}
  const en: Record<string, Record<string, string>> = {}
  for (const row of entries) {
    const namespace = row.namespace || 'common'
    const leafKey = row.key.includes('.') ? row.key.slice(row.key.indexOf('.') + 1) : row.key
    if (!tr[namespace]) tr[namespace] = {}
    if (!en[namespace]) en[namespace] = {}
    tr[namespace][leafKey] = row.tr
    en[namespace][leafKey] = row.en
  }
  return JSON.stringify({ tr, en }, null, 2)
}

export function resetCatalogForTests(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(I18N_CATALOG_KEY)
}
