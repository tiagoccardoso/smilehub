'use client'

import { useAuth } from '@/app/components/AppProvider'
import { publicSubscriptionPlans } from '@/lib/subscriptionPlans'
import { useRouter } from 'next/navigation'
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'

const commercialHighlights = [
  {
    title: 'Gestão organizada',
    description: 'Centralize pacientes, agenda, financeiro, relatórios e histórico clínico em uma rotina única.',
    icon: '✓',
  },
  {
    title: 'Atendimento mais ágil',
    description: 'Tenha informações importantes sempre à mão para reduzir retrabalho e acelerar o dia a dia.',
    icon: '↗',
  },
  {
    title: 'Controle administrativo',
    description: 'Organize permissões, configurações, dados da clínica e acompanhamento da assinatura em um só lugar.',
    icon: '⚙',
  },
]

const systemModules = [
  'Pacientes e clientes',
  'Agenda e agendamentos',
  'Odontograma',
  'Financeiro',
  'Relatórios',
  'Configurações administrativas',
]

const benefits = [
  'Mais previsibilidade na rotina da clínica',
  'Dados organizados para tomada de decisão',
  'Experiência moderna em desktop, tablet e celular',
]

function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <span className='required-label'>
      {children}
      <span className='required-mark' aria-hidden='true'>*</span>
    </span>
  )
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function Admin() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [publicName, setPublicName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [documentNumber, setDocumentNumber] = useState('')
  const [clinicPhone, setClinicPhone] = useState('')
  const [clinicWhatsapp, setClinicWhatsapp] = useState('')
  const [clinicEmail, setClinicEmail] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [district, setDistrict] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('Brasil')
  const [websiteEnabled, setWebsiteEnabled] = useState(false)
  const [publicDescription, setPublicDescription] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#2563eb')
  const [planCode, setPlanCode] = useState<'gestao' | 'personalizado'>('gestao')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { status, refreshSession } = useAuth()
  const router = useRouter()

  const suggestedSlug = useMemo(() => slugify(clinicName), [clinicName])

  useEffect(() => {
    if (isRegistering && !slugEdited) setSlug(suggestedSlug)
  }, [isRegistering, slugEdited, suggestedSlug])

  function toggleRegisterMode(next: boolean) {
    setIsRegistering(next)
    setError('')
    setSuccess('')
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isLoading) return

    try {
      if (!email.trim()) {
        setError('Informe o e-mail para continuar.')
        return
      }
      if (!password) {
        setError('Informe a senha para continuar.')
        return
      }
      if (isRegistering && !name.trim()) {
        setError('Informe o nome completo do responsável.')
        return
      }
      if (isRegistering && !clinicName.trim()) {
        setError('Informe o nome da clínica.')
        return
      }
      if (isRegistering && !acceptTerms) {
        setError('Aceite os termos de uso para continuar.')
        return
      }
      if (isRegistering && !acceptPrivacy) {
        setError('Aceite a política de privacidade para continuar.')
        return
      }
      if (isRegistering && password !== confirmPassword) {
        setError('A confirmação de senha não confere.')
        return
      }
      setIsLoading(true)
      setError('')
      setSuccess('')

      const payload = isRegistering
        ? {
            name,
            email,
            phone,
            password,
            confirmPassword,
            clinicName,
            publicName,
            slug,
            documentNumber,
            clinicPhone,
            clinicWhatsapp,
            clinicEmail,
            postalCode,
            street,
            number,
            complement,
            district,
            city,
            state,
            country,
            websiteEnabled,
            publicDescription,
            primaryColor,
            planCode,
            acceptTerms: acceptTerms ? 'on' : '',
            acceptPrivacy: acceptPrivacy ? 'on' : '',
          }
        : { email, password }

      const res = await fetch(isRegistering ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Não foi possível autenticar')
      if (isRegistering && data.authenticated === false) {
        setSuccess(data.message)
        return
      }

      await refreshSession()
      router.push('/admin/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    document.title = 'Entrar administrativo | SmileHub'
  }, [])

  useEffect(() => {
    if (status === 'authenticated') router.push('/admin/dashboard')
  }, [router, status])

  return (
    <section className='auth-premium min-h-[100dvh] w-full px-4 py-5 sm:px-6 sm:py-8 lg:px-8'>
      <div className='auth-layout mx-auto grid min-h-[calc(100dvh-2.5rem)] w-full max-w-7xl items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:items-center xl:gap-8'>
        <aside className='order-2 space-y-5 lg:order-1'>
          <div className='rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_28px_80px_rgba(26,43,60,0.13)] backdrop-blur sm:p-8'>
            <span className='inline-flex rounded-full bg-teal-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-teal-700'>SmileHub Gestão</span>
            <div className='mt-5 space-y-4'>
              <h1 className='font-[Manrope] text-3xl font-black leading-tight tracking-[-0.04em] text-slate-950 sm:text-4xl xl:text-5xl'>
                Sistema completo para uma clínica odontológica mais organizada, ágil e lucrativa.
              </h1>
              <p className='max-w-2xl text-base leading-7 text-slate-600 sm:text-lg'>
                Antes de acessar, conheça os principais recursos do SmileHub: gestão de pacientes, agenda, financeiro, relatórios, odontograma e controle administrativo em uma experiência moderna e responsiva.
              </p>
            </div>

            <div className='mt-6 flex flex-col gap-3 sm:flex-row'>
              <a href='#login-smilehub' className='inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500'>
                Acessar minha conta
              </a>
              <button type='button' onClick={() => toggleRegisterMode(true)} className='inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500'>
                Criar clínica agora
              </button>
            </div>
          </div>

          <div className='grid gap-3 sm:grid-cols-3'>
            {commercialHighlights.map(item => (
              <article key={item.title} className='rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_16px_42px_rgba(26,43,60,0.08)]'>
                <div className='mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-lg font-black text-teal-700'>{item.icon}</div>
                <h2 className='font-[Manrope] text-base font-extrabold text-slate-950'>{item.title}</h2>
                <p className='mt-2 text-sm leading-6 text-slate-600'>{item.description}</p>
              </article>
            ))}
          </div>

          <div className='grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'>
            <div className='rounded-[1.75rem] border border-white/80 bg-white/80 p-5 shadow-[0_16px_42px_rgba(26,43,60,0.08)]'>
              <h2 className='font-[Manrope] text-lg font-black text-slate-950'>Funcionalidades principais</h2>
              <div className='mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2'>
                {systemModules.map(module => (
                  <span key={module} className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700'>
                    {module}
                  </span>
                ))}
              </div>
            </div>

            <div className='rounded-[1.75rem] border border-white/80 bg-slate-950 p-5 text-white shadow-[0_20px_58px_rgba(4,22,39,0.24)]'>
              <h2 className='font-[Manrope] text-lg font-black'>Benefícios para a clínica</h2>
              <ul className='mt-4 space-y-3 text-sm leading-6 text-white/75'>
                {benefits.map(benefit => (
                  <li key={benefit} className='flex gap-3'>
                    <span className='mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-400 text-xs font-black text-slate-950'>✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div id='planos' className='rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_54px_rgba(26,43,60,0.10)] backdrop-blur sm:p-6'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
              <div>
                <span className='text-xs font-black uppercase tracking-[0.14em] text-teal-700'>Planos de assinatura</span>
                <h2 className='mt-1 font-[Manrope] text-2xl font-black tracking-[-0.03em] text-slate-950'>Escolha como começar</h2>
              </div>
              <p className='max-w-md text-sm leading-6 text-slate-600'>
                A contratação é feita após login/cadastro na área de Assinaturas, preservando o fluxo atual do Stripe.
              </p>
            </div>

            <div className='mt-5 grid gap-3 xl:grid-cols-3'>
              {publicSubscriptionPlans.map(plan => (
                <article key={plan.code} className={`relative overflow-hidden rounded-3xl border bg-white p-5 shadow-sm ${plan.featured ? 'border-teal-300 ring-4 ring-teal-100' : 'border-slate-200'}`}>
                  {plan.featured ? <span className='absolute right-4 top-4 rounded-full bg-teal-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-teal-800'>Recomendado</span> : null}
                  <span className='text-xs font-black uppercase tracking-[0.12em] text-teal-700'>{plan.badge}</span>
                  <h3 className='mt-3 pr-20 font-[Manrope] text-lg font-black text-slate-950'>{plan.title}</h3>
                  <strong className='mt-2 block font-[Manrope] text-2xl font-black tracking-[-0.04em] text-slate-950'>{plan.price}</strong>
                  {plan.priceNote ? <small className='mt-1 block text-sm font-bold text-slate-500'>{plan.priceNote}</small> : null}
                  <p className='mt-3 text-sm leading-6 text-slate-600'>{plan.description}</p>
                  <button type='button' onClick={() => toggleRegisterMode(true)} className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${plan.featured ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-slate-950 text-white hover:bg-slate-800'}`}>
                    Criar conta para assinar
                  </button>
                </article>
              ))}
            </div>
          </div>
        </aside>

        <div id='login-smilehub' className={`auth-card order-1 min-h-0 w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:order-2 ${isRegistering ? 'auth-card--register' : ''}`}>
          <form className='flex w-full flex-col gap-4 pb-1' onSubmit={handleSubmit} aria-busy={isLoading}>
            <h1 className='text-center text-2xl font-semibold text-slate-900 sm:text-3xl'>
              {isRegistering ? 'Criar conta SmileHub' : 'Entrar na SmileHub'}
            </h1>

            <p className='mx-auto max-w-2xl text-center text-sm leading-6 text-slate-600'>
              {isRegistering
                ? <>Cadastre o responsável, a clínica e o plano inicial. Use os campos marcados com <span className='font-bold text-red-600'>*</span> para concluir o cadastro. O trial de 7 dias é criado automaticamente.</>
                : 'Acesse sua área administrativa para gerenciar pacientes, agenda, financeiro, odontograma, relatórios e assinatura.'}
            </p>

            {isRegistering && (
              <div className='rounded-xl border border-slate-200 p-4'>
                <h2 className='mb-3 font-semibold text-slate-900'>Dados do responsável</h2>
                <div className='grid gap-3 md:grid-cols-3'>
                  <label className='text-sm font-medium text-slate-700'><RequiredLabel>Nome completo</RequiredLabel><input disabled={isLoading} value={name} onChange={e => setName(e.target.value)} type='text' className='mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2' required /></label>
                  <label className='text-sm font-medium text-slate-700'>Telefone/WhatsApp<input disabled={isLoading} value={phone} onChange={e => setPhone(e.target.value)} type='tel' className='mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2' /></label>
                  <label className='text-sm font-medium text-slate-700'>Plano<select value={planCode} onChange={e => { const next = e.target.value as 'gestao' | 'personalizado'; setPlanCode(next); setWebsiteEnabled(next === 'personalizado') }} className='mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2'><option value='gestao'>Gestão</option><option value='personalizado'>Personalizado</option></select></label>
                </div>
              </div>
            )}

            <div className={isRegistering ? 'rounded-xl border border-slate-200 p-4' : ''}>
              {isRegistering && <h2 className='mb-3 font-semibold text-slate-900'>Acesso</h2>}
              <div className={`grid gap-3 ${isRegistering ? 'md:grid-cols-3' : ''}`}>
                <label htmlFor='email' className='text-sm font-medium text-slate-700'><RequiredLabel>E-mail</RequiredLabel><input disabled={isLoading} autoFocus={!isRegistering} value={email} onChange={e => setEmail(e.target.value)} type='email' id='email' name='email' placeholder='voce@empresa.com' className='mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100' required /></label>
                <label htmlFor='password' className='text-sm font-medium text-slate-700'><RequiredLabel>Senha</RequiredLabel><input disabled={isLoading} value={password} onChange={e => setPassword(e.target.value)} type='password' id='password' name='password' placeholder='Digite sua senha' className='mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100' required /></label>
                {isRegistering && <label htmlFor='confirm-password' className='text-sm font-medium text-slate-700'><RequiredLabel>Confirmar senha</RequiredLabel><input disabled={isLoading} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type='password' id='confirm-password' name='confirmPassword' placeholder='Confirme a senha' className='mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100' required /></label>}
              </div>
            </div>

            {isRegistering && (
              <>
                <div className='rounded-xl border border-slate-200 p-4'>
                  <h2 className='mb-3 font-semibold text-slate-900'>Dados da clínica</h2>
                  <div className='grid gap-3 md:grid-cols-3'>
                    <label className='text-sm font-medium text-slate-700'><RequiredLabel>Nome da clínica</RequiredLabel><input value={clinicName} onChange={e => { setClinicName(e.target.value); if (!publicName) setPublicName(e.target.value) }} className='mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2' required /></label>
                    <label className='text-sm font-medium text-slate-700'>Nome público<input value={publicName} onChange={e => setPublicName(e.target.value)} className='mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2' /></label>
                    <label className='text-sm font-medium text-slate-700'><RequiredLabel>Slug/Subdomínio</RequiredLabel><input value={slug} onChange={e => { setSlugEdited(true); setSlug(slugify(e.target.value)) }} className='mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2' required /></label>
                    <label className='text-sm font-medium text-slate-700'>CNPJ ou CPF<input value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} className='mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2' /></label>
                    <label className='text-sm font-medium text-slate-700'>Telefone da clínica<input value={clinicPhone} onChange={e => setClinicPhone(e.target.value)} className='mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2' /></label>
                    <label className='text-sm font-medium text-slate-700'>WhatsApp da clínica<input value={clinicWhatsapp} onChange={e => setClinicWhatsapp(e.target.value)} className='mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2' /></label>
                    <label className='text-sm font-medium text-slate-700 md:col-span-2'>E-mail da clínica<input value={clinicEmail} onChange={e => setClinicEmail(e.target.value)} type='email' className='mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2' /></label>
                    <label className='text-sm font-medium text-slate-700'>Cor principal<input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} type='color' className='mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2' /></label>
                  </div>
                </div>

                <div className='rounded-xl border border-slate-200 p-4'>
                  <h2 className='mb-3 font-semibold text-slate-900'>Endereço</h2>
                  <div className='grid gap-3 md:grid-cols-4'>
                    <input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder='CEP' />
                    <input value={street} onChange={e => setStreet(e.target.value)} placeholder='Rua/Avenida' className='md:col-span-2' />
                    <input value={number} onChange={e => setNumber(e.target.value)} placeholder='Número' />
                    <input value={complement} onChange={e => setComplement(e.target.value)} placeholder='Complemento' />
                    <input value={district} onChange={e => setDistrict(e.target.value)} placeholder='Bairro' />
                    <input value={city} onChange={e => setCity(e.target.value)} placeholder='Cidade' />
                    <input value={state} onChange={e => setState(e.target.value)} placeholder='Estado' />
                    <input value={country} onChange={e => setCountry(e.target.value)} placeholder='País' />
                  </div>
                </div>

                <div className='rounded-xl border border-slate-200 p-4'>
                  <h2 className='mb-3 font-semibold text-slate-900'>Site público</h2>
                  <label className='mb-3 flex items-center gap-2 text-sm text-slate-700'><input type='checkbox' checked={websiteEnabled} onChange={e => setWebsiteEnabled(e.target.checked)} disabled={planCode !== 'personalizado'} />Ativar site público {planCode !== 'personalizado' && '(disponível no plano personalizado)'}</label>
                  <textarea value={publicDescription} onChange={e => setPublicDescription(e.target.value)} placeholder='Descrição curta da clínica' className='min-h-24 w-full rounded-md border border-slate-300 px-3 py-2' />
                </div>

                <div className='grid gap-2 text-sm text-slate-700 md:grid-cols-2'>
                  <label className='flex items-center gap-2'><input type='checkbox' checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} required aria-required='true' /><span>Aceito os termos de uso <span className='required-mark' aria-hidden='true'>*</span></span></label>
                  <label className='flex items-center gap-2'><input type='checkbox' checked={acceptPrivacy} onChange={e => setAcceptPrivacy(e.target.checked)} required aria-required='true' /><span>Aceito a política de privacidade <span className='required-mark' aria-hidden='true'>*</span></span></label>
                </div>
              </>
            )}

            {error && <p className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700'>{error}</p>}
            {success && <p className='rounded-md border border-green-200 bg-green-50 px-3 py-2 text-center text-sm text-green-700'>{success}</p>}

            <button disabled={isLoading} type='submit' className='mt-2 min-h-11 w-full rounded-md bg-blue-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400'>
              {isLoading ? (isRegistering ? 'Cadastrando...' : 'Entrando...') : isRegistering ? 'Cadastrar clínica' : 'Entrar'}
            </button>

            <button disabled={isLoading} type='button' className='mx-auto mt-2 text-sm font-medium text-blue-700 underline-offset-2 transition hover:text-blue-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-500' onClick={() => toggleRegisterMode(!isRegistering)}>
              {isRegistering ? 'Já tenho uma conta administrativa' : 'Cadastrar nova clínica'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
export default Admin
