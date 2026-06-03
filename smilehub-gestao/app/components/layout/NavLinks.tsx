'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type NavItem = { href: string; label: string; icon: string; roles: string[] }

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard', roles: ['superadmin', 'admin', 'dentist', 'reception', 'financial'] },
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
]

function isActive(pathname: string, href: string) {
  if (href === '/admin/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function NavLinks() {
  const pathname = usePathname()
  const [role, setRole] = useState<string>('')

  useEffect(() => {
    fetch('/api/me')
      .then(response => response.ok ? response.json() : null)
      .then(data => data && setRole(data.role))
      .catch(() => setRole(''))
  }, [])

  const filtered = useMemo(() => navItems.filter(item => item.roles.includes(role)), [role])

  return (
    <nav className='admin-nav' aria-label='Navegação administrativa'>
      {filtered.map(item => {
        const active = isActive(pathname, item.href)

        return (
          <Link key={item.href} href={item.href} className={`admin-nav-link ${active ? 'admin-nav-link-active' : ''}`}>
            <span className='material-symbols-outlined' aria-hidden='true'>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
