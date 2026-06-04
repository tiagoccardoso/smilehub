export function onlyCpfDigits(value?: string | null) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 11)
}

export function formatCpf(value?: string | null) {
  const digits = onlyCpfDigits(value)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export function isValidCpf(value?: string | null) {
  const cpf = onlyCpfDigits(value)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const calculateDigit = (base: string, factor: number) => {
    const total = base
      .split('')
      .reduce((sum, digit) => sum + Number(digit) * factor--, 0)
    const rest = (total * 10) % 11
    return rest === 10 ? 0 : rest
  }

  const firstDigit = calculateDigit(cpf.slice(0, 9), 10)
  const secondDigit = calculateDigit(cpf.slice(0, 10), 11)

  return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10])
}

export function normalizeOptionalCpf(value?: string | null) {
  const digits = onlyCpfDigits(value)
  return digits || null
}
