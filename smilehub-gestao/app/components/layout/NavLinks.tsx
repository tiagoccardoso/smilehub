'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { AdminIcon } from '@/app/components/admin/AdminIcon'
import { useAuth } from '@/app/components/AppProvider'

type NavItem = { href: string; label: string; icon: string; roles: string[]; alwaysEnabled?: boolean }

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Painel inicial', icon: 'dashboard', roles: ['superadmin', 'admin', 'dentist', 'reception', 'financial'] },
  { href: '/admin/patients', label: 'Pacientes', icon: 'groups', roles: ['superadmin', 'admin', 'dentist', 'reception'] },
  { href: '/admin/agenda', label: 'Agenda', icon: 'calendar_month', roles: ['superadmin', 'admin', 'dentist', 'reception'] },
  { href: '/admin/records', label: 'Prontuário', icon: 'clinical_notes', roles: ['superadmin', 'admin', 'dentist'] },
  { href: '/admin/odontogram', label: 'Odontograma', icon: 'dentistry', roles: ['superadmin', 'admin', 'dentist'] },
  { href: '/admin/procedures', label: 'Procedimentos', icon: 'medical_services', roles: ['superadmin', 'admin', 'dentist'] },
  { href: '/admin/budgets', label: 'Orçamentos', icon: 'request_quote', roles: ['superadmin', 'admin', 'dentist', 'reception'] },
  { href: '/admin/budget-items', label: 'Itens orçamento', icon: 'receipt_long', roles: ['superadmin', 'admin', 'dentist', 'reception'] },
  { href: '/admin/financial', label: 'Financeiro', icon: 'account_balance_wallet', roles: ['superadmin', 'admin', 'financial'] },
  { href: '/admin/professionals', label: 'Profissionais', icon: 'badge', roles: ['superadmin', 'admin', 'reception'] },
  { href: '/admin/reports', label: 'Relatórios', icon: 'monitoring', roles: ['superadmin', 'admin', 'financial'] },
  { href: '/admin/settings', label: 'Configurações', icon: 'tune', roles: ['superadmin', 'admin'] },
  { href: '/admin/users', label: 'Usuários', icon: 'manage_accounts', roles: ['superadmin'] },
  { href: '/admin/subscriptions', label: 'Assinaturas', icon: 'workspace_premium', roles: ['superadmin', 'admin', 'dentist', 'reception', 'financial'], alwaysEnabled: true },
]

function isActive(pathname: string, href: string) {
  if (href === '/admin/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function NavLinks() {
  const pathname = usePathname()
  const { session } = useAuth()
  const role = session?.role || ''
  const hasAccess = Boolean(session?.subscription?.hasAccess)

  const filtered = useMemo(() => {
    return navItems.filter(item => item.roles.includes(role) && (hasAccess || item.alwaysEnabled))
  }, [hasAccess, role])

  return (
    <nav className='admin-nav' aria-label='Navegação administrativa'>
      {filtered.map(item => {
        const active = isActive(pathname, item.href)

        return (
          <Link key={item.href} href={item.href} className={`admin-nav-link ${active ? 'admin-nav-link-active' : ''}`}>
            <AdminIcon name={item.icon} className='admin-svg-icon' />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
