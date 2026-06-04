export type RegisterInput = {
  name?: unknown
  email?: unknown
  password?: unknown
  confirmPassword?: unknown
  phone?: unknown
  clinicName?: unknown
  publicName?: unknown
  slug?: unknown
  documentNumber?: unknown
  clinicPhone?: unknown
  clinicWhatsapp?: unknown
  clinicEmail?: unknown
  postalCode?: unknown
  street?: unknown
  number?: unknown
  complement?: unknown
  district?: unknown
  city?: unknown
  state?: unknown
  country?: unknown
  websiteEnabled?: unknown
  publicDescription?: unknown
  primaryColor?: unknown
  planCode?: unknown
  acceptTerms?: unknown
  acceptPrivacy?: unknown
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateUserOnlyRegisterInput(input: RegisterInput) {
  const name = String(input.name ?? '').trim()
  const email = String(input.email ?? '').toLowerCase().trim()
  const password = String(input.password ?? '')

  if (!name || !email || !password) {
    return { ok: false as const, status: 400, message: 'Nome, e-mail e senha são obrigatórios.' }
  }

  if (!EMAIL_REGEX.test(email)) {
    return { ok: false as const, status: 400, message: 'Informe um e-mail válido.' }
  }

  if (password.length < 8) {
    return { ok: false as const, status: 400, message: 'A senha deve ter pelo menos 8 caracteres.' }
  }

  return {
    ok: true as const,
    data: { name, email, password },
  }
}

export function validateRegisterInput(input: RegisterInput) {
  const name = String(input.name ?? '').trim()
  const email = String(input.email ?? '').toLowerCase().trim()
  const password = String(input.password ?? '')
  const confirmPassword = String(input.confirmPassword ?? '')
  const clinicName = String(input.clinicName ?? '').trim()
  const planCode: 'gestao' | 'personalizado' = input.planCode === 'personalizado' ? 'personalizado' : 'gestao'

  if (!name || !email || !password) {
    return { ok: false as const, status: 400, message: 'Nome, e-mail e senha são obrigatórios.' }
  }

  if (!clinicName) {
    return { ok: false as const, status: 400, message: 'Informe o nome da clínica.' }
  }

  if (!EMAIL_REGEX.test(email)) {
    return { ok: false as const, status: 400, message: 'Informe um e-mail válido.' }
  }

  if (password.length < 8) {
    return { ok: false as const, status: 400, message: 'A senha deve ter pelo menos 8 caracteres.' }
  }

  if (!confirmPassword || confirmPassword !== password) {
    return { ok: false as const, status: 400, message: 'A confirmação de senha não confere.' }
  }

  const acceptTerms = input.acceptTerms === true || input.acceptTerms === 'on'
  const acceptPrivacy = input.acceptPrivacy === true || input.acceptPrivacy === 'on'

  if (!acceptTerms || !acceptPrivacy) {
    return { ok: false as const, status: 400, message: 'É obrigatório aceitar os termos de uso e a política de privacidade.' }
  }

  const text = (value: unknown) => String(value ?? '').trim() || null

  return {
    ok: true as const,
    data: {
      name,
      email,
      password,
      phone: text(input.phone),
      clinicName,
      publicName: text(input.publicName),
      slug: text(input.slug),
      documentNumber: text(input.documentNumber),
      clinicPhone: text(input.clinicPhone),
      clinicWhatsapp: text(input.clinicWhatsapp),
      clinicEmail: text(input.clinicEmail),
      postalCode: text(input.postalCode),
      street: text(input.street),
      number: text(input.number),
      complement: text(input.complement),
      district: text(input.district),
      city: text(input.city),
      state: text(input.state),
      country: text(input.country) || 'Brasil',
      websiteEnabled: input.websiteEnabled === true || input.websiteEnabled === 'on',
      publicDescription: text(input.publicDescription),
      primaryColor: text(input.primaryColor) || '#2563eb',
      planCode,
    },
  }
}
