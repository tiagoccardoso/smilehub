'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/AppProvider'

import { FormEvent, useEffect, useState } from 'react'

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

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      if (!name || !email || !password || !confirmPassword) {
        setError('Preencha os campos obrigatórios.')
        return
      }
      if (password !== confirmPassword) {
        setError('A confirmação de senha não confere.')
        return
      }
      setIsLoading(true)
      const body = { name, email, password, confirmPassword }
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
      setError(err.message)
    }
  }
  if (status === 'unauthenticated') {
    router.push('/')
  }
  return (
    <section>
      <div className=' py-16 md:py-24 lg:py-32 p-4'>
        <form
          className='mx-auto mb-4 max-w-md w-full pb-4'
          onSubmit={handleLogin}>
          <h1 className='text-center text-3xl my-8'>
            Criar um novo usuário SmileHub
          </h1>
          <div className='relative'>
            <input
              disabled={isLoading}
              value={name}
              onChange={e => setName(e.target.value)}
              type='text'
              className='my-4 '
              name='name'
              placeholder='nome de usuário'
              required
            />
          </div>
          <div className='relative'>
            <input
              disabled={isLoading}
              value={email}
              onChange={e => setEmail(e.target.value)}
              type='email'
              className='my-4 '
              name='email'
              placeholder='email'
              required
            />
          </div>
          <div className='relative mb-4 pb-2'>
            <input
              disabled={isLoading}
              value={password}
              onChange={e => setPassword(e.target.value)}
              type='password'
              className='my-4 '
              placeholder='senha'
              required
            />
          </div>

          <div className='relative mb-4 pb-2'>
            <input
              disabled={isLoading}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              type='password'
              className='my-4 '
              placeholder='confirmar senha'
              required
            />
          </div>


          {error && <p className='text-red-600 text-center my-4'>{error}</p>}
          {success && <p className='text-green-600 text-center my-4'>{success}</p>}
          <button
            disabled={isLoading}
            type='submit'
            className=' rounded px-6 py-3 text-center font-semibold text-white bg-blue-600  hover:bg-blue-800'>
            {isLoading ? 'Salvando...' : 'Criar usuário'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default CreateUser
