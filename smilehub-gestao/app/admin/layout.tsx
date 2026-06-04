'use client'

import { usePathname } from 'next/navigation'
import SideNav from '../components/layout/SideNav'
import { AdminTopbarActions } from '../components/admin/AdminTopbarActions'
import type { ReactNode } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
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
          <AdminTopbarActions />
        </header>
        <div className='admin-content'>{children}</div>
      </main>
    </div>
  )
}
