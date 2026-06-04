'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/app/components/AppProvider'

type PlanCode = 'trial' | 'mensal' | 'anual'

type SubscriptionActionsProps = {
  currentPlan?: string | null
  hasStripeSubscription: boolean
  trialAvailable: boolean
}

function actionLabel(action: string | null) {
  switch (action) {
    case 'trial': return 'Ativando teste...'
    case 'mensal': return 'Abrindo checkout mensal...'
    case 'anual': return 'Abrindo checkout anual...'
    case 'portal': return 'Abrindo portal...'
    case 'cancel': return 'Cancelando...'
    case 'migrate': return 'Migrando plano...'
    default: return null
  }
}

export function SubscriptionActions({ currentPlan, hasStripeSubscription, trialAvailable }: SubscriptionActionsProps) {
  const router = useRouter()
  const { refreshSession } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function postJson(url: string, body?: Record<string, unknown>) {
    const response = await fetch(url, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || 'Não foi possível concluir a ação.')
    return data
  }

  async function startTrial() {
    setLoading('trial')
    setError('')
    setMessage('')
    try {
      const data = await postJson('/api/subscriptions/trial')
      setMessage(data.message || 'Teste grátis ativado.')
      await refreshSession()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Não foi possível ativar o teste grátis.')
    } finally {
      setLoading(null)
    }
  }

  async function checkout(plan: Extract<PlanCode, 'mensal' | 'anual'>) {
    setLoading(plan)
    setError('')
    setMessage('Pagamento iniciado. Você será direcionado para o Stripe.')
    try {
      const data = await postJson('/api/stripe/checkout', { plan })
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message || 'Não foi possível iniciar o checkout.')
      setMessage('')
      setLoading(null)
    }
  }

  async function openPortal() {
    setLoading('portal')
    setError('')
    setMessage('Abrindo gerenciamento seguro no Stripe.')
    try {
      const data = await postJson('/api/stripe/portal')
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message || 'Não foi possível abrir o portal Stripe.')
      setMessage('')
      setLoading(null)
    }
  }

  async function cancelSubscription() {
    if (!confirm('Deseja cancelar a assinatura ao final do período atual?')) return
    setLoading('cancel')
    setError('')
    setMessage('')
    try {
      const data = await postJson('/api/stripe/subscription/cancel')
      setMessage(data.message || 'Cancelamento solicitado com sucesso.')
      await refreshSession()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Não foi possível cancelar a assinatura.')
    } finally {
      setLoading(null)
    }
  }

  async function migrateToAnnual() {
    if (!confirm('Deseja migrar do plano mensal para o plano anual? O Stripe poderá aplicar ajuste proporcional.')) return
    setLoading('migrate')
    setError('')
    setMessage('')
    try {
      const data = await postJson('/api/stripe/subscription/migrate')
      setMessage(data.message || 'Migração solicitada com sucesso.')
      await refreshSession()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Não foi possível migrar para o anual.')
    } finally {
      setLoading(null)
    }
  }

  const busyLabel = actionLabel(loading)

  return (
    <div className='space-y-4'>
      {busyLabel ? <p className='rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800'>{busyLabel}</p> : null}
      {message ? <p className='rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800'>{message}</p> : null}
      {error ? <p className='rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700'>{error}</p> : null}

      <div className='grid gap-4 lg:grid-cols-3'>
        <article className='subscription-plan-card premium-card'>
          <div>
            <span className='premium-status'>Teste</span>
            <h2>Teste Grátis</h2>
            <strong>7 dias grátis</strong>
            <p>Acesso completo ao sistema para testar agenda, pacientes, odontograma, financeiro e configurações.</p>
          </div>
          <button type='button' className='subscription-plan-button' onClick={startTrial} disabled={Boolean(loading) || !trialAvailable}>
            {trialAvailable ? 'Ativar teste grátis' : 'Teste grátis já utilizado'}
          </button>
        </article>

        <article className='subscription-plan-card premium-card'>
          <div>
            <span className='premium-status'>Mensal</span>
            <h2>Plano Mensal</h2>
            <strong>R$ 79,00/mês</strong>
            <p>Acesso completo ao sistema.<br />Ideal para consultórios que querem começar com baixo investimento.</p>
          </div>
          <button type='button' className='subscription-plan-button' onClick={() => checkout('mensal')} disabled={Boolean(loading) || currentPlan === 'mensal'}>
            {currentPlan === 'mensal' ? 'Plano atual' : 'Assinar mensal'}
          </button>
        </article>

        <article className='subscription-plan-card subscription-plan-featured premium-card'>
          <div>
            <span className='premium-status'>Melhor Oferta</span>
            <h2>Plano Anual — Melhor Oferta</h2>
            <strong>12x de R$ 59,90</strong>
            <small>ou R$ 718,80/ano</small>
            <p>Economia de R$ 229,20 por ano em comparação ao plano mensal.</p>
          </div>
          <button type='button' className='subscription-plan-button subscription-plan-button-featured' onClick={() => checkout('anual')} disabled={Boolean(loading) || currentPlan === 'anual'}>
            {currentPlan === 'anual' ? 'Plano atual' : 'Assinar anual'}
          </button>
        </article>
      </div>

      {hasStripeSubscription ? (
        <div className='premium-card subscription-management-card'>
          <div>
            <h2>Gerenciar assinatura</h2>
            <p>Use estas opções para cancelar, migrar do mensal para o anual ou abrir o portal seguro do Stripe.</p>
          </div>
          <div className='subscription-management-actions'>
            {currentPlan === 'mensal' ? <button type='button' className='subscription-plan-button' onClick={migrateToAnnual} disabled={Boolean(loading)}>Migrar para anual</button> : null}
            <button type='button' className='subscription-plan-button' onClick={openPortal} disabled={Boolean(loading)}>Portal do Stripe</button>
            <button type='button' className='subscription-danger-button' onClick={cancelSubscription} disabled={Boolean(loading)}>Cancelar assinatura</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
