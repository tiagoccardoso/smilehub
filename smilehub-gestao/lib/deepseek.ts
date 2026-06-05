import { sql } from '@/lib/neon'
import { decryptSecret } from '@/lib/secureCrypto'

export type DeepSeekTermEntry = {
  tooth_code?: string
  procedure?: string
  status?: string
  condition?: string | null
  notes?: string | null
  scheduled_date?: string | null
}

export type DeepSeekTermContext = {
  clinicId: string
  chartType: 'adult' | 'children'
  patientName?: string
  childName?: string
  birthOrAge?: string
  guardianName?: string
  relationship?: string
  professionalName?: string
  authorizedProcedures?: string
  observations?: string
  entries: DeepSeekTermEntry[]
}

export type DeepSeekErrorCode =
  | 'missing_token'
  | 'invalid_token'
  | 'timeout'
  | 'empty_response'
  | 'provider_error'
  | 'configuration_error'

export class DeepSeekServiceError extends Error {
  code: DeepSeekErrorCode
  status: number

  constructor(code: DeepSeekErrorCode, message: string, status = 400) {
    super(message)
    this.name = 'DeepSeekServiceError'
    this.code = code
    this.status = status
  }
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEFAULT_MODEL = 'deepseek-v4-flash'
const allowedModels = new Set(['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat'])

function cleanText(value: unknown, max = 700) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function safeModel(value: unknown) {
  const model = cleanText(value, 80)
  return allowedModels.has(model) ? model : DEFAULT_MODEL
}

async function readConfiguredToken(clinicId: string) {
  let rows: any[] = []
  try {
    rows = (await sql`
      select encrypted_api_key, model, status
        from clinic_ai_settings
       where clinic_id = ${clinicId}::uuid
       limit 1
    `) as any[]
  } catch (error) {
    throw new DeepSeekServiceError(
      'configuration_error',
      'A configuração da IA ainda não está disponível. Execute a migration de IA DeepSeek.',
      500,
    )
  }

  const settings = rows[0]
  if (!settings?.encrypted_api_key || settings.status !== 'configured') {
    throw new DeepSeekServiceError(
      'missing_token',
      'Configure o token da DeepSeek em Configurações antes de usar a IA.',
      400,
    )
  }

  try {
    return {
      token: decryptSecret(settings.encrypted_api_key),
      model: safeModel(settings.model),
    }
  } catch {
    throw new DeepSeekServiceError(
      'configuration_error',
      'Não foi possível descriptografar o token da DeepSeek. Salve o token novamente nas Configurações.',
      500,
    )
  }
}

function buildTermPrompt(context: DeepSeekTermContext) {
  const entries = context.entries.slice(0, 40).map((entry) => ({
    dente: cleanText(entry.tooth_code, 10),
    procedimento: cleanText(entry.procedure, 180),
    status: cleanText(entry.status, 80),
    condicao: cleanText(entry.condition, 140),
    observacoes: cleanText(entry.notes, 220),
    data_prevista: cleanText(entry.scheduled_date, 30),
  }))

  const isChild = context.chartType === 'children'

  return [
    {
      role: 'system',
      content:
        'Você apoia clínicas odontológicas na redação de termos de responsabilidade/autorização em português do Brasil. Responda somente com um texto editável, claro, profissional e objetivo. Não dê diagnóstico, não prometa resultados e não substitua validação profissional ou jurídica da clínica.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        tarefa: isChild
          ? 'Sugerir texto para termo de responsabilidade e autorização odontológica infantil assinado pelo responsável.'
          : 'Sugerir texto para termo de ciência/autorização odontológica do paciente adulto, quando a clínica desejar anexar ao odontograma.',
        orientacoes: [
          'Usar linguagem simples e profissional.',
          'Mencionar que o responsável/paciente recebeu orientações, pôde esclarecer dúvidas e autoriza/ciente dos procedimentos descritos.',
          'Incluir ressalva de que o texto deve ser revisado pela clínica antes de uso.',
          'Não incluir dados sensíveis desnecessários como documentos, telefones ou endereços.',
          'Não inventar procedimentos não listados.',
        ],
        dados: {
          tipo_odontograma: isChild ? 'infantil' : 'adulto',
          paciente: cleanText(context.patientName, 120),
          crianca: cleanText(context.childName, 120),
          nascimento_ou_idade: cleanText(context.birthOrAge, 80),
          responsavel: cleanText(context.guardianName, 120),
          parentesco: cleanText(context.relationship, 80),
          profissional: cleanText(context.professionalName, 120),
          procedimentos_autorizados_digitados: cleanText(context.authorizedProcedures, 1200),
          observacoes_gerais: cleanText(context.observations, 1200),
          registros_odontograma: entries,
        },
      }),
    },
  ]
}

function extractContent(payload: any) {
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item?.text === 'string' ? item.text : ''))
      .join('\n')
      .trim()
  }
  return ''
}

export async function generateResponsibilityTermWithDeepSeek(context: DeepSeekTermContext) {
  const { token, model } = await readConfiguredToken(context.clinicId)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages: buildTermPrompt(context),
        stream: false,
        temperature: 0.3,
        max_tokens: 900,
        thinking: { type: 'disabled' },
      }),
      signal: controller.signal,
    })

    if (response.status === 401 || response.status === 403) {
      throw new DeepSeekServiceError(
        'invalid_token',
        'Token da DeepSeek inválido ou sem permissão. Revise o token nas Configurações.',
        401,
      )
    }

    if (!response.ok) {
      throw new DeepSeekServiceError(
        'provider_error',
        'A DeepSeek não respondeu como esperado. Tente novamente em instantes.',
        502,
      )
    }

    const payload = await response.json()
    const text = extractContent(payload)
    if (!text) {
      throw new DeepSeekServiceError(
        'empty_response',
        'A IA retornou uma resposta vazia. Tente novamente com mais detalhes do odontograma.',
        502,
      )
    }

    return text
  } catch (error: any) {
    if (error instanceof DeepSeekServiceError) throw error
    if (error?.name === 'AbortError') {
      throw new DeepSeekServiceError(
        'timeout',
        'A DeepSeek demorou para responder. Tente novamente em instantes.',
        504,
      )
    }
    throw new DeepSeekServiceError(
      'provider_error',
      'Não foi possível consultar a DeepSeek agora. Verifique sua conexão e tente novamente.',
      502,
    )
  } finally {
    clearTimeout(timeout)
  }
}
