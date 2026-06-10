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
  | 'out_of_scope'

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

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type AiProvider = {
  name: 'DeepSeek' | 'OpenAI'
  apiKey?: string
  apiUrl: string
  model: string
}

const DEFAULT_DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat'
const DEFAULT_OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
const SYSTEM_HELP_SCOPE_KEYWORDS = [
  'sistema', 'smilehub', 'agenda', 'agendamento', 'paciente', 'pacientes', 'odontograma', 'dente', 'dentes',
  'procedimento', 'procedimentos', 'prontuario', 'prontuário', 'financeiro', 'orçamento', 'orcamento', 'relatório',
  'relatorio', 'nfs', 'nfse', 'nota fiscal', 'assinatura', 'plano', 'stripe', 'configuração', 'configuracao',
  'usuário', 'usuario', 'permissão', 'permissao', 'profissional', 'clinica', 'clínica', 'termo', 'responsabilidade',
  'autorização', 'autorizacao', 'ajuda', 'treinamento', 'como usar', 'cadastro', 'alerta', 'dashboard', 'menu',
]

function cleanText(value: unknown, max = 700) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function env(name: string) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function deepSeekProvider(): AiProvider {
  return {
    name: 'DeepSeek',
    apiKey: env('DEEPSEEK_API_KEY'),
    apiUrl: env('DEEPSEEK_API_URL') || DEFAULT_DEEPSEEK_API_URL,
    model: env('DEEPSEEK_MODEL') || DEFAULT_DEEPSEEK_MODEL,
  }
}

function openAiProvider(): AiProvider {
  return {
    name: 'OpenAI',
    apiKey: env('OPENAI_API_KEY'),
    apiUrl: env('OPENAI_API_URL') || DEFAULT_OPENAI_API_URL,
    model: env('OPENAI_MODEL') || DEFAULT_OPENAI_MODEL,
  }
}

function buildTermPrompt(context: DeepSeekTermContext): ChatMessage[] {
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

export const SMILEHUB_TRAINING_CONTENT = `
SmileHub é um sistema de gestão clínica odontológica. Use estas orientações como base exclusiva para responder dúvidas do usuário sobre o próprio sistema:

1. Dashboard: mostra visão geral da rotina da clínica, indicadores e atalhos principais.
2. Agenda: permite acompanhar agendamentos, criar atendimentos, editar horários e controlar comparecimento/cancelamentos.
3. Pacientes: centraliza cadastro, dados de contato, histórico e informações usadas nos atendimentos.
4. Profissionais: cadastra dentistas e equipe, permitindo vínculo com agendas, procedimentos e atendimentos.
5. Procedimentos: mantém a lista de serviços/procedimentos disponíveis para agenda, orçamento e odontograma.
6. Odontograma: permite selecionar paciente, alternar entre odontograma adulto e infantil, clicar no dente, registrar procedimento, status, condição, data prevista e observações. Também permite imprimir relatório, gerar termo com IA, revisar texto, coletar assinatura digital, salvar histórico, reemitir, imprimir, atualizar ou excluir termos.
7. Orçamentos e itens do orçamento: permitem montar propostas de tratamento por paciente, com itens, quantidades e valores.
8. Financeiro: acompanha cobranças, recebimentos, status financeiro e, quando configurado, integra emissão fiscal/NFS-e.
9. Relatórios: consolida indicadores de pacientes, agenda, financeiro, procedimentos, profissionais e tratamentos.
10. Configurações: administra dados da clínica, conteúdo do site público, certificado NFS-e e perfil do usuário. A configuração da IA não é feita por esta tela; ela usa variáveis de ambiente no servidor.
11. Assinaturas: mostra status do plano, fim do teste, próxima cobrança, opções de plano mensal/anual, cancelamento, portal Stripe e migração do mensal para o anual.
12. Alertas: o sino no cabeçalho mostra pendências importantes como assinatura, configurações, agendamentos e pontos que precisam de atenção.
13. Ajuda: o ícone de ponto de interrogação abre treinamento resumido e chat de dúvidas limitado ao funcionamento do SmileHub.

Regras de resposta do chat de ajuda:
- Responda apenas sobre uso, telas, fluxos e funcionalidades do SmileHub.
- Não responda perguntas clínicas, jurídicas, financeiras pessoais, programação genérica ou assuntos fora do sistema.
- Quando faltar contexto, oriente o usuário a informar a tela ou ação que está tentando executar.
- Seja direto, em português do Brasil, com passos práticos.
`.trim()

function buildHelpPrompt(question: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'Você é o chat de ajuda interno do SmileHub. Responda somente dúvidas sobre o funcionamento do sistema SmileHub usando a base de treinamento fornecida. Se a pergunta estiver fora do escopo do sistema, recuse educadamente e explique que este chat é exclusivo para dúvidas sobre o SmileHub. Não invente funcionalidades.',
    },
    {
      role: 'user',
      content: JSON.stringify({ treinamento: SMILEHUB_TRAINING_CONTENT, pergunta: cleanText(question, 1200) }),
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

async function callOpenAiCompatibleProvider(provider: AiProvider, messages: ChatMessage[], maxTokens = 900) {
  if (!provider.apiKey) {
    throw new DeepSeekServiceError(
      'missing_token',
      `${provider.name} não configurado no servidor.`,
      500,
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)

  try {
    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        stream: false,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    })

    if (response.status === 401 || response.status === 403) {
      throw new DeepSeekServiceError(
        'invalid_token',
        `${provider.name} não autorizou a requisição. Revise a configuração server-side.`,
        401,
      )
    }

    if (!response.ok) {
      throw new DeepSeekServiceError(
        'provider_error',
        `${provider.name} não respondeu como esperado.`,
        502,
      )
    }

    const payload = await response.json()
    const text = extractContent(payload)
    if (!text) {
      throw new DeepSeekServiceError(
        'empty_response',
        `${provider.name} retornou uma resposta vazia.`,
        502,
      )
    }

    return text
  } catch (error: any) {
    if (error instanceof DeepSeekServiceError) throw error
    if (error?.name === 'AbortError') {
      throw new DeepSeekServiceError(
        'timeout',
        `${provider.name} demorou para responder.`,
        504,
      )
    }
    throw new DeepSeekServiceError(
      'provider_error',
      `${provider.name} não pôde ser consultado no momento.`,
      502,
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function generateWithFallback(messages: ChatMessage[], maxTokens = 900) {
  const primary = deepSeekProvider()
  const fallback = openAiProvider()
  let primaryError: DeepSeekServiceError | null = null

  try {
    return await callOpenAiCompatibleProvider(primary, messages, maxTokens)
  } catch (error: any) {
    primaryError = error instanceof DeepSeekServiceError
      ? error
      : new DeepSeekServiceError('provider_error', 'A IA principal não pôde ser consultada.', 502)
  }

  if (fallback.apiKey) {
    try {
      return await callOpenAiCompatibleProvider(fallback, messages, maxTokens)
    } catch (fallbackError: any) {
      if (fallbackError instanceof DeepSeekServiceError && primaryError?.code === 'missing_token') {
        throw fallbackError
      }
    }
  }

  if (primaryError?.code === 'missing_token' && !fallback.apiKey) {
    throw new DeepSeekServiceError(
      'missing_token',
      'IA não configurada no servidor. Configure DEEPSEEK_API_KEY e, opcionalmente, OPENAI_API_KEY como fallback.',
      500,
    )
  }

  throw new DeepSeekServiceError(
    primaryError?.code || 'provider_error',
    'Não foi possível consultar a IA no momento. Tente novamente em instantes.',
    primaryError?.status || 502,
  )
}

export async function generateResponsibilityTermWithDeepSeek(context: DeepSeekTermContext) {
  return generateWithFallback(buildTermPrompt(context), 900)
}

export function isSmileHubHelpQuestion(question: string) {
  const normalized = cleanText(question, 1200).toLowerCase()
  if (!normalized) return false
  return SYSTEM_HELP_SCOPE_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

export async function generateSmileHubHelpAnswer(question: string) {
  const safeQuestion = cleanText(question, 1200)
  if (!isSmileHubHelpQuestion(safeQuestion)) {
    throw new DeepSeekServiceError(
      'out_of_scope',
      'Este chat é exclusivo para dúvidas sobre o funcionamento do SmileHub. Pergunte sobre telas, cadastros, odontograma, agenda, financeiro, assinaturas ou configurações do sistema.',
      400,
    )
  }

  return generateWithFallback(buildHelpPrompt(safeQuestion), 700)
}
