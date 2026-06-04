'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import NavLinks from './NavLinks'
import { ProfileModalButton } from '../admin/ProfileModal'
import { useAuth } from '@/app/components/AppProvider'

function initialsFromName(value?: string | null) {
  if (!value) return 'SH'
  const parts = value.replace(/@.*/, '').split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0] || value).slice(0, 2).toUpperCase()
}

function SideNav() {
  const { session, status, logout, refreshSession } = useAuth()
  const router = useRouter()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')
  const logoUrl = session?.clinic?.logoUrl || '/smilehub.webp'

  async function handleLogout() {
    await logout()
    router.replace('/admin')
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || logoUploading) return
    setLogoUploading(true)
    setLogoError('')
    const formData = new FormData()
    formData.append('logo', file)
    try {
      const response = await fetch('/api/admin/logo', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Não foi possível trocar a logo.')
      await refreshSession()
    } catch (error: any) {
      setLogoError(error.message || 'Não foi possível trocar a logo.')
    } finally {
      setLogoUploading(false)
      event.currentTarget.value = ''
    }
  }

  if (status !== 'authenticated') return null

  return (
    <div className='admin-side-inner'>
      <div className='admin-brand' aria-label='SmileHub'>
        <button
          type='button'
          className='admin-brand-mark admin-brand-logo-button'
          onClick={() => logoInputRef.current?.click()}
          disabled={logoUploading}
          title='Clique para enviar uma nova logo'
        >
          <Image alt='SmileHub' width={44} height={44} src={logoUrl} />
        </button>
        <input ref={logoInputRef} type='file' accept='image/jpeg,image/png,image/webp,image/gif' className='sr-only' onChange={handleLogoChange} />
        <Link className='admin-brand-copy' href='/admin/dashboard' aria-label='Ir para o painel inicial'>
          <strong>{session?.clinic?.name || 'SmileHub'}</strong>
          <small>{logoUploading ? 'Enviando logo...' : 'Gestão clínica'}</small>
        </Link>
      </div>
      {logoError ? <p className='rounded-xl border border-red-300 bg-red-50/10 p-2 text-xs text-red-100'>{logoError}</p> : null}

      <div className='admin-sidebar-section'>
        <span className='admin-sidebar-eyebrow'>Operação clínica</span>
        <NavLinks />
      </div>

      <div className='admin-user-card'>
        {session?.avatarUrl ? <img src={session.avatarUrl} alt='Avatar do usuário' className='admin-user-avatar object-cover' /> : <span className='admin-user-avatar'>{initialsFromName(session?.user || session?.email)}</span>}
        <span className='admin-user-copy'>
          <ProfileModalButton
            buttonClassName='admin-user-name-button'
            trigger={<strong>{session?.user || 'Usuário SmileHub'}</strong>}
          />
          <small>Clique para editar perfil</small>
        </span>
      </div>

      <button type='button' className='admin-logout-button' onClick={handleLogout}>
        Sair
      </button>
    </div>
  )
}
export default SideNav
