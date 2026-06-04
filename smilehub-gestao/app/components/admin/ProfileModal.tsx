'use client'

import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useAuth } from '@/app/components/AppProvider'

type ProfileData = {
  name: string
  email: string
  phone?: string | null
  avatar_url?: string | null
}

type ProfileModalButtonProps = {
  label?: string
  className?: string
  buttonClassName?: string
  trigger?: ReactNode
}

export function ProfileModalButton({ label = 'Editar perfil', className, buttonClassName, trigger }: ProfileModalButtonProps) {
  const { refreshSession } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profile, setProfile] = useState<ProfileData>({ name: '', email: '', phone: '', avatar_url: '' })

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError('')
    fetch('/api/admin/profile', { cache: 'no-store' })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Não foi possível carregar o perfil.')
        if (active) setProfile(data.profile)
      })
      .catch(err => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    setSuccess('')
    const form = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/admin/profile', { method: 'PATCH', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Não foi possível salvar o perfil.')
      setProfile(data.profile)
      setSuccess('Perfil atualizado com sucesso.')
      await refreshSession()
    } catch (err: any) {
      setError(err.message || 'Não foi possível salvar o perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <span className={className}>
      <button type='button' className={buttonClassName || 'rounded-full border px-4 py-2 text-sm font-semibold hover:bg-blue-50'} onClick={() => setOpen(true)}>
        {trigger || label}
      </button>
      {open ? (
        <div className='fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4' role='dialog' aria-modal='true' aria-labelledby='profile-modal-title'>
          <div className='max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-sm font-semibold uppercase tracking-wide text-blue-700'>Perfil do usuário</p>
                <h2 id='profile-modal-title' className='text-2xl font-bold'>Editar meus dados</h2>
                <p className='text-sm text-slate-600'>Atualize nome, telefone e foto exibidos no sistema.</p>
              </div>
              <button type='button' className='rounded-full border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50' onClick={() => setOpen(false)}>Fechar</button>
            </div>

            {loading ? <p className='mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600'>Carregando perfil...</p> : (
              <form className='mt-5 grid gap-4' onSubmit={handleSubmit}>
                <label>Nome <strong className='required-mark'>*</strong><input name='name' defaultValue={profile.name} required /></label>
                <label>E-mail<input value={profile.email || ''} readOnly disabled /></label>
                <label>Telefone/WhatsApp<input name='phone' defaultValue={profile.phone || ''} placeholder='(00) 00000-0000' /></label>
                <label>Foto/avatar<input name='avatar' type='file' accept='image/jpeg,image/png,image/webp,image/gif' /></label>
                {profile.avatar_url ? <img src={profile.avatar_url} alt='Avatar atual' className='h-24 w-24 rounded-full border object-cover' /> : null}
                {error ? <p className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>{error}</p> : null}
                {success ? <p className='rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'>{success}</p> : null}
                <button type='submit' disabled={saving}>{saving ? 'Salvando...' : 'Salvar perfil'}</button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </span>
  )
}
