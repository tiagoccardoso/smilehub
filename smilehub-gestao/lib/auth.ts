import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { createAdminUser, getAdminByEmail, updateAdminUserPassword as updateAdminUserPasswordInDb } from '@/lib/db'
import { sql } from '@/lib/neon'
import { getDefaultPublicSiteDomain, normalizeDomain, slugifyClinicName } from '@/lib/clinicUtils'
import { AdminRole, AdminUserRow } from '@/lib/types'

const SESSION_COOKIE = 'admin-session'
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7
const HASH_ITERATIONS = 120000
const KEY_LENGTH = 64
const DIGEST = 'sha512'

type SessionPayload = {
  sub: string
  email?: string | null
  name: string
  role: AdminRole
  exp: number
}

function getAuthSecret() {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('Variável de ambiente NEON_AUTH_COOKIE_SECRET/AUTH_SECRET/NEXTAUTH_SECRET ausente')
  return secret
}

function hashPassword(password: string, salt?: string) {
  const effectiveSalt = salt ?? crypto.randomBytes(16).toString('hex')
  const hash = crypto
    .pbkdf2Sync(password, effectiveSalt, HASH_ITERATIONS, KEY_LENGTH, DIGEST)
    .toString('hex')
  return `${effectiveSalt}:${hash}`
}

function verifyPassword(password: string, passwordHash: string) {
  const [salt, currentHash] = passwordHash.split(':')
  if (!salt || !currentHash) return false
  const candidate = hashPassword(password, salt).split(':')[1]
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(currentHash))
}

function signPayload(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto
    .createHmac('sha256', getAuthSecret())
    .update(body)
    .digest('base64url')
  return `${body}.${sig}`
}

function verifyToken(token: string): SessionPayload | null {
  try {
    const [body, sig] = token.split('.')
    if (!body || !sig) return null

    const expected = crypto
      .createHmac('sha256', getAuthSecret())
      .update(body)
      .digest('base64url')

    const signature = Buffer.from(sig)
    const expectedSignature = Buffer.from(expected)
    if (signature.length !== expectedSignature.length) return null
    if (!crypto.timingSafeEqual(signature, expectedSignature)) return null

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export async function createUser(email: string, name: string, password: string, role: AdminRole = 'admin') {
  const normalizedEmail = email.toLowerCase().trim()
  const normalizedName = name.trim()
  return createAdminUser(normalizedEmail, normalizedName, role, hashPassword(password))
}

export async function authenticate(email: string, password: string) {
  const user = await getAdminByEmail(email)
  if (!user?.password_hash || !verifyPassword(password, user.password_hash)) return null
  return user
}

export async function setSession(user: { id: string; email?: string | null; name: string; role: AdminRole }) {
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + ONE_WEEK_SECONDS,
  }
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, signPayload(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_WEEK_SECONDS,
  })
}

export async function clearSession() {
  const cookieStore = await cookies(); cookieStore.delete(SESSION_COOKIE)
}

export async function getCurrentAdminProfile() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  return { profile: { id: payload.sub, email: payload.email, name: payload.name, role: payload.role }, role: payload.role }
}


export type ClinicRegistrationPayload = {
  name: string
  email: string
  password: string
  phone?: string | null
  clinicName: string
  publicName?: string | null
  slug?: string | null
  documentNumber?: string | null
  clinicPhone?: string | null
  clinicWhatsapp?: string | null
  clinicEmail?: string | null
  postalCode?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  district?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  websiteEnabled?: boolean
  publicDescription?: string | null
  primaryColor?: string | null
  planCode?: 'gestao' | 'personalizado'
}

export async function createUserWithClinic(payload: ClinicRegistrationPayload) {
  const normalizedEmail = payload.email.toLowerCase().trim()
  const normalizedName = payload.name.trim()
  const clinicName = payload.clinicName.trim()
  const slug = slugifyClinicName(payload.slug || clinicName)
  const planCode = payload.planCode === 'personalizado' ? 'personalizado' : 'gestao'
  const personalized = planCode === 'personalizado'
  const websiteEnabled = personalized && payload.websiteEnabled !== false
  const defaultDomain = `${slug}.${getDefaultPublicSiteDomain()}`
  const normalizedDomain = normalizeDomain(defaultDomain)
  const passwordHash = hashPassword(payload.password)

  const rows = await sql`
    with new_user as (
      insert into public."user" (email, name, role, password_hash, phone)
      values (${normalizedEmail}, ${normalizedName}, 'admin'::admin_role, ${passwordHash}, ${payload.phone || null})
      returning id, email, name, role
    ),
    new_clinic as (
      insert into public.clinics (
        name, slug, public_name, document_number, phone, whatsapp, email,
        primary_color, public_description, postal_code, street, number,
        complement, district, city, state, country, status, website_enabled, management_enabled
      )
      values (
        ${clinicName}, ${slug}, ${payload.publicName || clinicName}, ${payload.documentNumber || null},
        ${payload.clinicPhone || null}, ${payload.clinicWhatsapp || null}, ${payload.clinicEmail || normalizedEmail},
        ${payload.primaryColor || '#2563eb'}, ${payload.publicDescription || null}, ${payload.postalCode || null},
        ${payload.street || null}, ${payload.number || null}, ${payload.complement || null}, ${payload.district || null},
        ${payload.city || null}, ${payload.state || null}, ${payload.country || 'Brasil'}, 'trialing', ${websiteEnabled}, true
      )
      returning id, name, slug
    ),
    membership as (
      insert into public.clinic_users (clinic_id, user_id, role, is_owner)
      select new_clinic.id, new_user.id, 'admin'::admin_role, true
        from new_clinic, new_user
      returning id
    ),
    domain as (
      insert into public.clinic_domains (clinic_id, domain, normalized_domain, type, status, is_primary, dns_instructions)
      select new_clinic.id, ${defaultDomain}, ${normalizedDomain}, 'subdomain', 'active', true, '{}'::jsonb
        from new_clinic
      returning id
    ),
    entitlements as (
      insert into public.clinic_entitlements (clinic_id, feature_code, enabled)
      select new_clinic.id, feature_code, enabled
        from new_clinic,
        (values
          ('management', true),
          ('public_website', ${personalized}),
          ('online_booking', ${personalized}),
          ('custom_domain', ${personalized})
        ) as v(feature_code, enabled)
      returning id
    ),
    subscription as (
      insert into public.clinic_subscriptions (clinic_id, plan_code, status, trial_started_at, trial_ends_at)
      select new_clinic.id, ${planCode}, 'trialing', now(), now() + interval '7 days'
        from new_clinic
      returning id
    ),
    initial_content as (
      insert into public.site_content_settings (clinic_id, section, title, subtitle, body, extra)
      select new_clinic.id, section, title, subtitle, body, '{}'::jsonb
        from new_clinic,
        (values
          ('home', 'Reconecte-se com o seu sorriso', 'SmileHub - Uma nova abordagem para o conforto odontológico', 'Torne seu sorriso perfeito ainda melhor'),
          ('about', 'Conheça a clínica', 'Nossa missão', coalesce(${payload.publicDescription || null}, 'Oferecer cuidado odontológico excepcional em um ambiente confortável e acolhedor.')),
          ('services', 'Nossos serviços odontológicos', 'Tratamentos completos para prevenção, estética, restauração e reabilitação oral.', 'Edite esta área nas configurações para destacar serviços, diferenciais e orientações da clínica.')
        ) as v(section, title, subtitle, body)
      returning id
    )
    select new_user.id, new_user.email, new_user.name, new_user.role, new_clinic.id as clinic_id
      from new_user, new_clinic
  `

  return (rows as (AdminUserRow & { clinic_id: string })[])[0]
}

export async function updateUserPassword(id: string, password: string) {
  await updateAdminUserPasswordInDb(id, hashPassword(password))
}
