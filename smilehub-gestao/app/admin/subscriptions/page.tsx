import { redirect } from 'next/navigation'
import { requireSubscriptionContext, planLabel, statusLabelForSubscription } from '@/lib/subscription'
import { SubscriptionActions } from './subscription-actions'

function formatDate(value?: string | null) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function getFeedback(params: Record<string, string | undefined>, accessMessage: string) {
  if (params.checkout === 'success') return 'Pagamento iniciado com sucesso. Assim que o webhook do Stripe confirmar a assinatura, o acesso será liberado automaticamente.'
  if (params.checkout === 'cancel') return 'Checkout cancelado. Nenhuma cobrança foi concluída.'
  if (params.portal === 'return') return 'Retorno do portal Stripe recebido. As alterações serão refletidas após a confirmação do webhook.'
  if (params.bloqueado === '1') return accessMessage
  return null
}

export default async function SubscriptionsPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const context = await requireSubscriptionContext()
  if (!context.admin) redirect('/admin')

  const params = (await searchParams) ?? {}
  const subscription = context.subscription
  const feedback = getFeedback(params, context.access.message)
  const trialAvailable = !subscription?.trial_started_at && !subscription?.trial_ends_at

  return (
    <section className='space-y-6'>
      <div>
        <span className='premium-status'>Assinaturas</span>
        <h1>Planos SmileHub</h1>
        <p>Escolha um plano para liberar o acesso completo ao sistema. Sem assinatura ativa ou teste grátis válido, os módulos internos permanecem bloqueados.</p>
      </div>

      {feedback ? <p className='rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800'>{feedback}</p> : null}

      <div className='premium-card subscription-status-card'>
        <div>
          <span className='premium-status'>{context.access.hasAccess ? 'Acesso liberado' : 'Acesso bloqueado'}</span>
          <h2>Status atual</h2>
          <p>{context.access.message}</p>
        </div>
        <dl className='subscription-status-grid'>
          <div><dt>Clínica</dt><dd>{context.clinic?.name || 'Não vinculada'}</dd></div>
          <div><dt>Plano</dt><dd>{planLabel(subscription?.plan_code)}</dd></div>
          <div><dt>Status Stripe/Sistema</dt><dd>{statusLabelForSubscription(subscription?.status)}</dd></div>
          <div><dt>Fim do teste</dt><dd>{formatDate(subscription?.trial_ends_at)}</dd></div>
          <div><dt>Próxima cobrança/período</dt><dd>{formatDate(subscription?.current_period_ends_at)}</dd></div>
          <div><dt>Cancelamento</dt><dd>{subscription?.cancel_at_period_end ? 'Agendado para fim do período' : subscription?.canceled_at ? formatDate(subscription.canceled_at) : 'Não solicitado'}</dd></div>
        </dl>
      </div>

      <SubscriptionActions
        currentPlan={subscription?.plan_code || null}
        hasStripeSubscription={Boolean(subscription?.stripe_subscription_id)}
        trialAvailable={trialAvailable}
      />
    </section>
  )
}
