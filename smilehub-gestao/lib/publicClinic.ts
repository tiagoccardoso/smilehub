import { headers } from 'next/headers'
import { sql } from '@/lib/neon'
import { normalizeDomain } from '@/lib/clinicUtils'

export type PublicClinic = {
  id: string
  name: string
  slug: string
  public_name: string | null
  document_number: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  logo_url: string | null
  primary_color: string | null
  public_description: string | null
  postal_code: string | null
  street: string | null
  number: string | null
  complement: string | null
  district: string | null
  city: string | null
  state: string | null
  country: string | null
  website_enabled: boolean
}

function hostFromRequest(request?: Request) {
  const forwarded = request?.headers.get('x-forwarded-host')
  const host = forwarded || request?.headers.get('host') || ''
  return normalizeDomain(host)
}

export async function resolveClinicByHost(request?: Request) {
  let host = hostFromRequest(request)
  if (!host) {
    const headerList = await headers()
    host = normalizeDomain(headerList.get('x-forwarded-host') || headerList.get('host') || '')
  }

  if (!host) return null

  const rows = await sql`
    select c.*
      from clinic_domains cd
      join clinics c on c.id = cd.clinic_id
      join clinic_entitlements ce on ce.clinic_id = c.id and ce.feature_code = 'public_website' and ce.enabled = true
     where cd.normalized_domain = ${host}
       and cd.status = 'active'
       and c.status in ('active','trialing')
       and c.website_enabled = true
     limit 1
  `

  return ((rows as PublicClinic[])[0] ?? null)
}

export async function requirePublicClinic(request?: Request) {
  const clinic = await resolveClinicByHost(request)
  if (!clinic) throw new Error('Clínica pública não encontrada ou site público desativado')
  return clinic
}
