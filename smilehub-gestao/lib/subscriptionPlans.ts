export type PublicSubscriptionPlanCode = 'trial' | 'mensal' | 'anual'

export type PublicSubscriptionPlan = {
  code: PublicSubscriptionPlanCode
  badge: string
  title: string
  price: string
  priceNote?: string
  description: string
  highlights: string[]
  ctaLabel: string
  featured?: boolean
}

export const publicSubscriptionPlans: PublicSubscriptionPlan[] = [
  {
    code: 'trial',
    badge: 'Teste',
    title: 'Teste Grátis',
    price: '7 dias grátis',
    description: 'Acesso completo ao sistema para testar agenda, pacientes, odontograma, financeiro e configurações.',
    highlights: ['Sem compromisso inicial', 'Acesso completo', 'Ideal para validar a rotina'],
    ctaLabel: 'Ativar teste grátis',
  },
  {
    code: 'mensal',
    badge: 'Mensal',
    title: 'Plano Mensal',
    price: 'R$ 79,00/mês',
    description: 'Acesso completo ao sistema. Ideal para consultórios que querem começar com baixo investimento.',
    highlights: ['Pagamento mensal', 'Gestão completa', 'Flexível para começar'],
    ctaLabel: 'Assinar mensal',
  },
  {
    code: 'anual',
    badge: 'Melhor Oferta',
    title: 'Plano Anual',
    price: '12x de R$ 59,90',
    priceNote: 'ou R$ 718,80/ano',
    description: 'Economia de R$ 229,20 por ano em comparação ao plano mensal.',
    highlights: ['Melhor custo-benefício', 'Acesso completo', 'Economia anual'],
    ctaLabel: 'Assinar anual',
    featured: true,
  },
]
