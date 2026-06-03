'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import NavLinks from './NavLinks'
import { useAuth } from '@/app/components/AppProvider'

function initialsFromEmail(value?: string | null) {
  if (!value) return 'SH'
  const name = value.split('@')[0] || value
  return name.slice(0, 2).toUpperCase()
}

function SideNav() {
  const { session, status, logout } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.replace('/admin')
  }

  if (status !== 'authenticated') return null

  return (
    <div className='admin-side-inner'>
      <Link className='admin-brand' href='/admin/dashboard' aria-label='Ir para o painel inicial'>
        <span className='admin-brand-mark'>
          <Image alt='SmileHub' width={44} height={44} src='/smilehub.webp' />
        </span>
        <span className='admin-brand-copy'>
          <strong>SmileHub</strong>
          <small>Gestão clínica</small>
        </span>
      </Link>

      <div className='admin-sidebar-section'>
        <span className='admin-sidebar-eyebrow'>Operação clínica</span>
        <NavLinks />
      </div>

      <div className='admin-user-card'>
        <span className='admin-user-avatar'>{initialsFromEmail(session?.user)}</span>
        <span className='admin-user-copy'>
          <strong>{session?.user || 'Usuário SmileHub'}</strong>
          <small>Ambiente seguro</small>
        </span>
      </div>

      <button type='button' className='admin-logout-button' onClick={handleLogout}>
        Sair
      </button>
    </div>
  )
}
export default SideNav
