'use client'

import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/AppProvider'

function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <span className='required-label'>
      {children}
      <span className='required-mark' aria-hidden='true'>*</span>
    </span>
  )
}

function CreateUser() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    document.title = 'Criar usuário | Admin | SmileHub'
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const cleanName = name.trim()
    const cleanEmail = email.trim()

    try {
      if (!cleanName) {
        setError('Informe o nome do usuário.')
        return
      }
      if (!cleanEmail) {
        setError('Informe o e-mail do usuário.')
        return
      }
      if (!password) {
        setError('Informe a senha do usuário.')
        return
      }
      if (!confirmPassword) {
        setError('Confirme a senha do usuário.')
        return
      }
      if (password !== confirmPassword) {
        setError('A confirmação de senha não confere.')
        return
      }

      setIsLoading(true)
      const body = { name: cleanName, email: cleanEmail, password, confirmPassword }
      const res = await fetch('/api/users/register', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Usuário criado com sucesso.')
        router.push('/admin/users')
        return
      }
      setError(data.message ?? 'Não foi possível cadastrar o usuário. Revise os dados e tente novamente.')
      setIsLoading(false)
    } catch (err: any) {
      setIsLoading(false)
      setError(err.message || 'Não foi possível cadastrar o usuário. Tente novamente.')
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin')
  }, [router, status])

  return (
    <section>
      <div className='p-4 py-16 md:py-24 lg:py-32'>
        <form className='mx-auto mb-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm' onSubmit={handleSubmit} aria-busy={isLoading}>
          <h1 className='my-4 text-center text-3xl font-bold text-slate-900'>Criar novo usuário SmileHub</h1>
          <p className='mb-5 text-center text-sm text-slate-600'>Preencha os campos marcados com <span className='font-bold text-red-600'>*</span>.</p>

          <label className='mb-3 block text-sm font-medium text-slate-700'>
            <RequiredLabel>Nome de usuário</RequiredLabel>
            <input disabled={isLoading} value={name} onChange={e => setName(e.target.value)} type='text' className='mt-1' name='name' placeholder='Digite o nome completo' required aria-required='true' />
          </label>

          <label className='mb-3 block text-sm font-medium text-slate-700'>
            <RequiredLabel>E-mail</RequiredLabel>
            <input disabled={isLoading} value={email} onChange={e => setEmail(e.target.value)} type='email' className='mt-1' name='email' placeholder='usuario@clinica.com.br' required aria-required='true' />
          </label>

          <label className='mb-3 block text-sm font-medium text-slate-700'>
            <RequiredLabel>Senha</RequiredLabel>
            <input disabled={isLoading} value={password} onChange={e => setPassword(e.target.value)} type='password' className='mt-1' name='password' placeholder='Digite a senha' required aria-required='true' />
          </label>

          <label className='mb-4 block text-sm font-medium text-slate-700'>
            <RequiredLabel>Confirmar senha</RequiredLabel>
            <input disabled={isLoading} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type='password' className='mt-1' name='confirmPassword' placeholder='Confirme a senha' required aria-required='true' />
          </label>

          {error && <p className='my-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700'>{error}</p>}
          {success && <p className='my-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-center text-sm text-green-700'>{success}</p>}
          <button disabled={isLoading} type='submit' className='w-full rounded px-6 py-3 text-center font-semibold text-white bg-blue-600 hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400'>
            {isLoading ? 'Salvando...' : 'Criar usuário'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default CreateUser
