import { DataApiRequestError } from '@/lib/dataApi'

type PublicError = {
  status: number
  message: string
}

function isDuplicateEmailError(error: DataApiRequestError) {
  const details = error.details as { code?: string; message?: string; details?: string } | null
  const constraint = `${(details as { constraint?: string } | null)?.constraint ?? ''}`.toLowerCase()
  const text = `${details?.message ?? ''} ${details?.details ?? ''}`.toLowerCase()
  return (
    details?.code === '23505' &&
    (text.includes('email') || constraint.includes('email'))
  )
}

function isDuplicateNameError(error: DataApiRequestError) {
  const details = error.details as { code?: string; message?: string; details?: string; constraint?: string } | null
  const text = `${details?.message ?? ''} ${details?.details ?? ''}`.toLowerCase()
  const constraint = `${details?.constraint ?? ''}`.toLowerCase()
  return details?.code === '23505' && (text.includes('name') || constraint.includes('name'))
}

export function toSafeAuthError(error: unknown): PublicError {
  if (error instanceof DataApiRequestError) {
    if (isDuplicateEmailError(error)) {
      return { status: 409, message: 'Este e-mail já está cadastrado.' }
    }
    if (isDuplicateNameError(error)) {
      return { status: 409, message: 'Este nome de usuário já está em uso.' }
    }

    const isConfigOrPermissionIssue = error.status === 401 || error.status === 403
    if (isConfigOrPermissionIssue) {
      return {
        status: 500,
        message: 'Configuração de autenticação indisponível no momento. Tente novamente em instantes.',
      }
    }

    return {
      status: 503,
      message: 'Serviço de autenticação indisponível no momento. Tente novamente em instantes.',
    }
  }

  if (error instanceof Error && error.message.includes('Variável de ambiente')) {
    return { status: 500, message: 'Configuração obrigatória do servidor ausente. Tente novamente em instantes.' }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('duplicate key') || message.includes('"user"_email_key')) {
      return { status: 409, message: 'Este e-mail já está cadastrado.' }
    }
    if (message.includes('"user"_name_key')) {
      return { status: 409, message: 'Este nome de usuário já está em uso.' }
    }
    if (message.includes('null value') || message.includes('violates not-null constraint')) {
      return { status: 400, message: 'Dados obrigatórios ausentes ou inválidos. Revise os campos e tente novamente.' }
    }
    if (message.includes('invalid input syntax')) {
      return { status: 400, message: 'Formato de dados inválido. Revise os campos e tente novamente.' }
    }
  }

  return { status: 400, message: 'Não foi possível cadastrar o usuário. Revise os dados e tente novamente.' }
}
