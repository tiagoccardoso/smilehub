import { sql } from '@/lib/neon'

export type SiteContentSection = 'home' | 'about' | 'services'

export type SiteContentRow = {
  section: SiteContentSection
  title: string | null
  subtitle: string | null
  body: string | null
  image_url: string | null
  extra: Record<string, unknown> | null
}

export const defaultSiteContent: Record<SiteContentSection, SiteContentRow> = {
  home: {
    section: 'home',
    title: 'Reconecte-se com o seu sorriso',
    subtitle: 'SmileHub - Uma nova abordagem para o conforto odontológico',
    body: 'Torne seu sorriso perfeito ainda melhor',
    image_url: null,
    extra: null,
  },
  about: {
    section: 'about',
    title: 'Conheça a clínica: onde os sorrisos brilham mais',
    subtitle: 'Nossa missão',
    body: 'Nossa missão é oferecer cuidado odontológico excepcional em um ambiente confortável e acolhedor.',
    image_url: null,
    extra: null,
  },
  services: {
    section: 'services',
    title: 'Nossos serviços odontológicos',
    subtitle: 'Tratamentos completos para prevenção, estética, restauração e reabilitação oral.',
    body: 'Edite esta área nas configurações para destacar serviços, diferenciais e orientações da clínica.',
    image_url: null,
    extra: null,
  },
}

export async function getSiteContent(clinicId?: string | null) {
  try {
    const rows = clinicId
      ? await sql`select section, title, subtitle, body, image_url, extra from site_content_settings where clinic_id = ${clinicId}::uuid`
      : await sql`select section, title, subtitle, body, image_url, extra from site_content_settings order by created_at asc limit 3`

    return (rows as SiteContentRow[]).reduce((acc, row) => {
      if (row.section in defaultSiteContent) acc[row.section] = { ...defaultSiteContent[row.section], ...row }
      return acc
    }, { ...defaultSiteContent })
  } catch {
    return { ...defaultSiteContent }
  }
}
