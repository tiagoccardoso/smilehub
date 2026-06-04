'use client'

import { useAuth } from '@/app/components/AppProvider'
import { useRouter } from 'next/navigation'
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'


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
    <section className='auth-premium flex min-h-[100dvh] w-full items-center justify-center px-4 py-8 sm:px-6'>
      <div className={`auth-card w-full ${isRegistering ? 'max-w-5xl' : 'max-w-[28rem]'} rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8`}>
        <form className='flex w-full flex-col gap-4' onSubmit={handleSubmit} aria-busy={isLoading}>
          <h1 className='text-center text-2xl font-semibold text-slate-900 sm:text-3xl'>
            {isRegistering ? 'Criar conta SmileHub' : 'Entrar na SmileHub'}
          </h1>

          {isRegistering && (
            <p className='mx-auto max-w-3xl text-center text-sm text-slate-600'>
              Cadastre o responsável, a clínica e o plano inicial. Use os campos marcados com <span className='font-bold text-red-600'>*</span> para concluir o cadastro. O trial de 7 dias é criado automaticamente e os dados da clínica ficam isolados por clinic_id.
            </p>
          )}

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

          <button disabled={isLoading} type='button' className='mx-auto mt-2 text-sm font-medium text-blue-700 underline-offset-2 transition hover:text-blue-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-500' onClick={() => { setIsRegistering(prev => !prev); setError(''); setSuccess('') }}>
            {isRegistering ? 'Já tenho uma conta administrativa' : 'Cadastrar nova clínica'}
          </button>
        </form>
      </div>
    </section>
  )
}
export default Admin
