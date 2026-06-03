export function slugifyClinicName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
}

export function normalizeDomain(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/^www\./, '')
}

export function getDefaultPublicSiteDomain() {
  return (process.env.NEXT_PUBLIC_PUBLIC_SITE_DOMAIN || process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'smilehub.com.br')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .trim()
}
