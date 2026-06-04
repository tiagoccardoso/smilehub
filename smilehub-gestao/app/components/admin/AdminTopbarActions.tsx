'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { AdminIcon } from './AdminIcon'

type SearchGroup = {
  category: string
  items: { id: string; title: string; subtitle?: string; href: string }[]
}

type AlertItem = {
  id: string
  title: string
  message: string
  href?: string
  severity?: 'info' | 'warning' | 'success' | 'danger'
}

export function AdminTopbarActions() {
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setGroups([])
      setSearchLoading(false)
      return
    }
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      setSearchLoading(true)
      fetch(`/api/admin/global-search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then(async response => {
          const data = await response.json()
          if (!response.ok) throw new Error(data.message || 'Erro na busca')
          setGroups(data.groups || [])
        })
        .catch(() => setGroups([]))
        .finally(() => setSearchLoading(false))
    }, 320)
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function refreshAlerts() {
    setAlertsLoading(true)
    try {
      const response = await fetch('/api/admin/alerts', { cache: 'no-store' })
      const data = await response.json()
      if (response.ok) setAlerts(data.alerts || [])
    } finally {
      setAlertsLoading(false)
    }
  }

  async function loadAlerts() {
    setAlertsOpen(prev => !prev)
    if (!alerts.length) await refreshAlerts()
  }

  const totalResults = groups.reduce((sum, group) => sum + group.items.length, 0)

  return (
    <div className='admin-topbar-actions' aria-label='Ações rápidas'>
      <div className='admin-search-box' ref={searchRef}>
        <label className='admin-search-pill' aria-label='Busca global'>
          <AdminIcon name='search' className='admin-svg-icon' />
          <input
            type='search'
            value={query}
            onChange={event => { setQuery(event.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            placeholder='Buscar pacientes, agendas, serviços...'
          />
        </label>
        {searchOpen && query.trim().length >= 2 ? (
          <div className='admin-floating-panel admin-search-results'>
            {searchLoading ? <p className='admin-empty-state'>Buscando...</p> : null}
            {!searchLoading && totalResults === 0 ? <p className='admin-empty-state'>Nenhum resultado encontrado.</p> : null}
            {groups.map(group => group.items.length ? (
              <div key={group.category} className='admin-result-group'>
                <strong>{group.category}</strong>
                {group.items.map(item => (
                  <Link key={`${group.category}-${item.id}`} href={item.href} onClick={() => setSearchOpen(false)}>
                    <span>{item.title}</span>
                    {item.subtitle ? <small>{item.subtitle}</small> : null}
                  </Link>
                ))}
              </div>
            ) : null)}
          </div>
        ) : null}
      </div>

      <div className='admin-alert-box'>
        <button type='button' className='admin-icon-pill' aria-label='Abrir alertas' onClick={loadAlerts}>
          <AdminIcon name='notifications' className='admin-svg-icon' />
          {alerts.length ? <span className='admin-alert-badge'>{alerts.length}</span> : null}
        </button>
        {alertsOpen ? (
          <div className='admin-floating-panel admin-alert-panel'>
            <div className='admin-panel-title'>
              <strong>Alertas</strong>
              <button type='button' onClick={refreshAlerts}>Atualizar</button>
            </div>
            {alertsLoading ? <p className='admin-empty-state'>Carregando alertas...</p> : null}
            {!alertsLoading && !alerts.length ? <p className='admin-empty-state'>Nenhum alerta no momento.</p> : null}
            {alerts.map(alert => {
              const content = (
                <>
                  <strong>{alert.title}</strong>
                  <span>{alert.message}</span>
                </>
              )
              return alert.href ? <Link key={alert.id} className={`admin-alert-item admin-alert-${alert.severity || 'info'}`} href={alert.href}>{content}</Link> : <div key={alert.id} className={`admin-alert-item admin-alert-${alert.severity || 'info'}`}>{content}</div>
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
