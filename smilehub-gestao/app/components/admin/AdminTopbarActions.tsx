'use client'

import Link from 'next/link'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { AdminIcon } from './AdminIcon'

type SearchGroup = {
  category: string
  items: { id: string; title: string; subtitle?: string; href: string }[]
}

type AlertItem = {
  id: string
  title: string
  message: string
  href?: string
  severity?: 'info' | 'warning' | 'success' | 'danger'
}

type HelpMessage = {
  role: 'user' | 'assistant'
  content: string
}

const HELP_TRAINING_SECTIONS = [
  {
    title: 'Primeiros passos',
    text: 'Use o menu lateral para acessar Dashboard, Agenda, Pacientes, Profissionais, Procedimentos, Odontograma, Financeiro, Relatórios, Configurações e Assinaturas.',
  },
  {
    title: 'Agenda e pacientes',
    text: 'Cadastre pacientes, profissionais e procedimentos antes de criar ou acompanhar atendimentos na agenda.',
  },
  {
    title: 'Odontograma',
    text: 'Selecione o paciente, escolha odontograma adulto ou infantil, clique no dente, registre procedimento, condição, status, data prevista e observações. A área de termos permite gerar texto com IA, revisar, assinar, salvar histórico e imprimir.',
  },
  {
    title: 'Financeiro e relatórios',
    text: 'Use orçamentos, itens e financeiro para acompanhar valores. Os relatórios consolidam dados de agenda, pacientes, profissionais, tratamentos e receitas.',
  },
  {
    title: 'Assinaturas e alertas',
    text: 'A tela Assinaturas mostra status, trial, planos mensal/anual, cancelamento, portal Stripe e migração. O sino exibe alertas importantes do sistema.',
  },
]

export function AdminTopbarActions() {
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpQuestion, setHelpQuestion] = useState('')
  const [helpLoading, setHelpLoading] = useState(false)
  const [helpError, setHelpError] = useState('')
  const [helpMessages, setHelpMessages] = useState<HelpMessage[]>([
    {
      role: 'assistant',
      content: 'Olá! Pergunte sobre como usar o SmileHub: agenda, pacientes, odontograma, termos, financeiro, relatórios, configurações ou assinaturas.',
    },
  ])
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setGroups([])
      setSearchLoading(false)
      return
    }
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      setSearchLoading(true)
      fetch(`/api/admin/global-search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then(async response => {
          const data = await response.json()
          if (!response.ok) throw new Error(data.message || 'Erro na busca')
          setGroups(data.groups || [])
        })
        .catch(() => setGroups([]))
        .finally(() => setSearchLoading(false))
    }, 320)
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function refreshAlerts() {
    setAlertsLoading(true)
    try {
      const response = await fetch('/api/admin/alerts', { cache: 'no-store' })
      const data = await response.json()
      if (response.ok) setAlerts(data.alerts || [])
    } finally {
      setAlertsLoading(false)
    }
  }

  async function loadAlerts() {
    setAlertsOpen(prev => !prev)
    setHelpOpen(false)
    if (!alerts.length) await refreshAlerts()
  }

  function toggleHelp() {
    setHelpOpen(prev => !prev)
    setAlertsOpen(false)
    setHelpError('')
  }

  async function sendHelpQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const question = helpQuestion.trim()
    if (!question || helpLoading) return

    setHelpQuestion('')
    setHelpError('')
    setHelpLoading(true)
    setHelpMessages(current => [...current, { role: 'user', content: question }])

    try {
      const response = await fetch('/api/admin/help-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Não foi possível responder agora.')
      setHelpMessages(current => [...current, { role: 'assistant', content: String(data.answer || '').trim() || 'Não encontrei uma orientação para essa dúvida.' }])
    } catch (error: any) {
      const message = error?.message || 'Não foi possível responder agora.'
      setHelpError(message)
      setHelpMessages(current => [...current, { role: 'assistant', content: message }])
    } finally {
      setHelpLoading(false)
    }
  }

  const totalResults = groups.reduce((sum, group) => sum + group.items.length, 0)

  return (
    <div className='admin-topbar-actions' aria-label='Ações rápidas'>
      <div className='admin-search-box' ref={searchRef}>
        <label className='admin-search-pill' aria-label='Busca global'>
          <AdminIcon name='search' className='admin-svg-icon' />
          <input
            type='search'
            value={query}
            onChange={event => { setQuery(event.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            placeholder='Buscar pacientes, agendas, serviços...'
          />
        </label>
        {searchOpen && query.trim().length >= 2 ? (
          <div className='admin-floating-panel admin-search-results'>
            {searchLoading ? <p className='admin-empty-state'>Buscando...</p> : null}
            {!searchLoading && totalResults === 0 ? <p className='admin-empty-state'>Nenhum resultado encontrado.</p> : null}
            {groups.map(group => group.items.length ? (
              <div key={group.category} className='admin-result-group'>
                <strong>{group.category}</strong>
                {group.items.map(item => (
                  <Link key={`${group.category}-${item.id}`} href={item.href} onClick={() => setSearchOpen(false)}>
                    <span>{item.title}</span>
                    {item.subtitle ? <small>{item.subtitle}</small> : null}
                  </Link>
                ))}
              </div>
            ) : null)}
          </div>
        ) : null}
      </div>

      <div className='admin-help-box'>
        <button type='button' className='admin-icon-pill' aria-label='Abrir ajuda e treinamento' onClick={toggleHelp} aria-expanded={helpOpen}>
          <AdminIcon name='help' className='admin-svg-icon' />
        </button>
        {helpOpen ? (
          <div className='admin-floating-panel admin-help-panel'>
            <div className='admin-panel-title'>
              <strong>Ajuda e treinamento</strong>
              <button type='button' onClick={() => setHelpOpen(false)}>Fechar</button>
            </div>
            <div className='admin-human-support-notice' role='note' aria-label='Atendimento humanizado'>
              <strong>Atendimento humanizado</strong>
              <p>
                Os registros de tickets para atendimento humanizado devem ser realizados através da plataforma SelectSaaS.
              </p>
              <a href='https://www.selectsaas.com.br' target='_blank' rel='noopener noreferrer'>
                https://www.selectsaas.com.br
              </a>
            </div>
            <div className='admin-help-training'>
              {HELP_TRAINING_SECTIONS.map(section => (
                <article key={section.title}>
                  <strong>{section.title}</strong>
                  <p>{section.text}</p>
                </article>
              ))}
            </div>
            <div className='admin-help-chat' aria-live='polite'>
              <strong>Chat de dúvidas sobre o sistema</strong>
              <div className='admin-help-chat-messages'>
                {helpMessages.map((message, index) => (
                  <p key={`${message.role}-${index}`} className={`admin-help-message admin-help-message-${message.role}`}>
                    {message.content}
                  </p>
                ))}
                {helpLoading ? <p className='admin-help-message admin-help-message-assistant'>Consultando a IA...</p> : null}
              </div>
              {helpError ? <p className='admin-help-error'>{helpError}</p> : null}
              <form className='admin-help-chat-form' onSubmit={sendHelpQuestion}>
                <input
                  type='text'
                  value={helpQuestion}
                  onChange={event => setHelpQuestion(event.target.value)}
                  placeholder='Ex.: Como salvo um termo no odontograma?'
                  aria-label='Pergunta para o chat de ajuda'
                />
                <button type='submit' disabled={helpLoading || !helpQuestion.trim()}>Enviar</button>
              </form>
            </div>
          </div>
        ) : null}
      </div>

      <div className='admin-alert-box'>
        <button type='button' className='admin-icon-pill' aria-label='Abrir alertas' onClick={loadAlerts} aria-expanded={alertsOpen}>
          <AdminIcon name='notifications' className='admin-svg-icon' />
          {alerts.length ? <span className='admin-alert-badge'>{alerts.length}</span> : null}
        </button>
        {alertsOpen ? (
          <div className='admin-floating-panel admin-alert-panel'>
            <div className='admin-panel-title'>
              <strong>Alertas</strong>
              <button type='button' onClick={refreshAlerts}>Atualizar</button>
            </div>
            {alertsLoading ? <p className='admin-empty-state'>Carregando alertas...</p> : null}
            {!alertsLoading && !alerts.length ? <p className='admin-empty-state'>Nenhum alerta no momento.</p> : null}
            {alerts.map(alert => {
              const content = (
                <>
                  <strong>{alert.title}</strong>
                  <span>{alert.message}</span>
                </>
              )
              return alert.href ? <Link key={alert.id} className={`admin-alert-item admin-alert-${alert.severity || 'info'}`} href={alert.href}>{content}</Link> : <div key={alert.id} className={`admin-alert-item admin-alert-${alert.severity || 'info'}`}>{content}</div>
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
