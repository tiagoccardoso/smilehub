'use client'

import { AdminRole, UserType } from '@/lib/types'
import { FormEvent, useState } from 'react'

function EditUserModal({
  user,
  onUserUpdate,
}: {
  user: UserType
  onUserUpdate: () => void
}) {
  const [showUser, setShowUser] = useState(false)
  const [name, setName] = useState(user.name || '')
  const [email, setEmail] = useState(user.email || '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AdminRole>(user.role)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    try {
      setIsLoading(true)
      const body = { _id: user._id, name, email, password, role }
      const res = await fetch('/api/users/', {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        onUserUpdate()
        setShowUser(false)
        setPassword('')
        setIsLoading(false)
        return
      }
      const data = await res.json()
      setError(data.message ?? 'Não foi possível atualizar o usuário.')
      setIsLoading(false)
    } catch (error: any) {
      setIsLoading(false)
      setError(error.message)
    }
  }
  return (
    <>
      <button className='btn' onClick={() => setShowUser(prev => !prev)}>
        Editar
      </button>
      {showUser ? (
        <div className='fixed inset-0 z-40' onClick={() => setShowUser(false)}>
          <div className=' flex min-h-svh overflow-x-hidden overflow-y-scroll fixed inset-0 z-50  '>
            <div className=' my-6 mx-auto flex items-center justify-center max-w-4xl w-full'>
              <div
                onClick={event => event.stopPropagation()}
                className='border-0 rounded-lg shadow-lg  flex flex-col w-full bg-white '>
                <div className=' flex items-center justify-center p-4 border-b border-solid'>
                  <form
                    className='mx-auto mb-4 max-w-md w-full pb-4'
                    onSubmit={handleEdit}>
                    <h1 className='text-center text-3xl my-8'>
                      Editar {user.name}
                    </h1>
                    <div className='relative'>
                      <input
                        value={name}
                        disabled={isLoading}
                        onChange={e => setName(e.target.value)}
                        type='text'
                        className='my-4 '
                        name='name'
                        placeholder='nome'
                        required
                      />
                    </div>
                    <div className='relative'>
                      <input
                        value={email}
                        disabled={isLoading}
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
                        value={password}
                        disabled={isLoading}
                        onChange={e => setPassword(e.target.value)}
                        type='password'
                        className='my-4 '
                        placeholder='senha'
                      />
                    </div>
                    <div className='relative mb-4 pb-2'>
                      <label className='block text-sm mb-2'>Perfil</label>
                      <select
                        className='my-2 w-full border rounded p-3'
                        value={role}
                        disabled={isLoading}
                        onChange={e => setRole(e.target.value as AdminRole)}>
                        <option value='admin'>Administrador</option>
                        <option value='superadmin'>Superadministrador</option>
                        <option value='dentist'>Dentista</option>
                        <option value='reception'>Recepção</option>
                        <option value='financial'>Financeiro</option>
                      </select>
                    </div>
                    {error && (
                      <p className='text-red-600 text-center '>{error}</p>
                    )}
                    <button
                      type='submit'
                      className=' rounded px-6 py-3 text-center font-semibold text-white bg-blue-600  hover:bg-blue-800'>
                      {isLoading ? 'Salvando...' : 'Confirmar'}
                    </button>
                  </form>
                </div>
                <div className='flex md:flex-row flex-col gap-4 items-center justify-end p-6 border-t border-solid  rounded-b'>
                  <div className='inline-flex '>
                    <button
                      className='bg-red-500 hover:bg-red-600 text-white rounded  background-transparent font-bold uppercase px-6 py-3  md:text-sm text-xs  mr-1 mb-1  '
                      type='button'
                      onClick={() => setShowUser(prev => !prev)}>
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className='opacity-25 fixed inset-0 z-40 bg-black'></div>
        </div>
      ) : null}
    </>
  )
}
export default EditUserModal
