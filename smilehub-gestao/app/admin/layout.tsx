'use client'

import { usePathname } from 'next/navigation'
import SideNav from '../components/layout/SideNav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAuthScreen = pathname === '/admin'

  if (isAuthScreen) {
    return <>{children}</>
  }

  return (
    <div className='admin-premium'>
      <aside className='admin-sidebar'>
        <SideNav />
      </aside>
      <main className='admin-main'>
        <header className='admin-topbar'>
          <div>
            <p className='admin-topbar-kicker'>Sistema odontológico premium</p>
            <h2>Gestão clínica SmileHub</h2>
          </div>
          <div className='admin-topbar-actions' aria-label='Ações rápidas'>
            <span className='admin-search-pill'><span className='material-symbols-outlined' aria-hidden='true'>search</span>Buscar</span>
            <span className='admin-icon-pill'><span className='material-symbols-outlined' aria-hidden='true'>notifications</span></span>
          </div>
        </header>
        <div className='admin-content'>{children}</div>
      </main>
    </div>
  )
}
