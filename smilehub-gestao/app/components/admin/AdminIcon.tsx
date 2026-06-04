type AdminIconProps = {
  name: string
  className?: string
  title?: string
}

type SvgPath = string | string[]

const iconPaths: Record<string, SvgPath> = {
  dashboard: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h5A1.5 1.5 0 0 1 12 5.5v5A1.5 1.5 0 0 1 10.5 12h-5A1.5 1.5 0 0 1 4 10.5v-5Zm8 0A1.5 1.5 0 0 1 13.5 4h5A1.5 1.5 0 0 1 20 5.5v3A1.5 1.5 0 0 1 18.5 10h-5A1.5 1.5 0 0 1 12 8.5v-3ZM4 15.5A1.5 1.5 0 0 1 5.5 14h5a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 10.5 20h-5A1.5 1.5 0 0 1 4 18.5v-3Zm8-1A1.5 1.5 0 0 1 13.5 13h5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-5a1.5 1.5 0 0 1-1.5-1.5v-4Z',
  groups: ['M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M15.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M3.5 19.5c.9-3.2 2.7-5.2 5-5.2s4.1 2 5 5.2', 'M12.8 18.8c.9-2.1 2.4-3.4 4.2-3.4 1.7 0 3.1 1.1 4 3.3'],
  calendar_month: ['M7 3v3M17 3v3M4.5 8.5h15', 'M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z', 'M8 12h2M12 12h2M16 12h1M8 16h2M12 16h2'],
  calendar_today: ['M7 3v3M17 3v3M5 8h14', 'M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z', 'M8 12h8M8 16h5'],
  clinical_notes: ['M7 4h7l3 3v13H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M14 4v4h4M8 12h8M8 16h6M8 8h3'],
  dentistry: ['M8.2 4.2c1.2-.5 2.6.1 3.8.9 1.2-.8 2.6-1.4 3.8-.9 2.3.9 3.2 4.2 1.8 7.5-.5 1.2-1.3 2.4-1.6 3.7-.5 2.2-.8 4.6-2.5 4.6-1.2 0-1.3-2.2-1.5-3.9-.2-1.2-.5-2.1-1-2.1s-.8.9-1 2.1c-.2 1.7-.3 3.9-1.5 3.9-1.7 0-2-2.4-2.5-4.6-.3-1.3-1.1-2.5-1.6-3.7-1.4-3.3-.5-6.6 1.8-7.5Z', 'M9 7.5c1.1.6 2.2.8 3 .8s1.9-.2 3-.8'],
  medical_services: ['M9 4h6v4h4v12H5V8h4V4Z', 'M11 4v4M13 4v4M9 14h6M12 11v6'],
  request_quote: ['M6 3.5h9l3 3V20H6V3.5Z', 'M15 3.5V7h3M9 10h6M9 13h6M9 16h3', 'M15 16.5c0 .8.7 1.5 1.8 1.5S18.5 17.5 18.5 17s-.4-1-1.7-1.3c-1.2-.3-1.7-.7-1.7-1.3s.6-1.2 1.6-1.2c1.1 0 1.7.6 1.7 1.3'],
  receipt_long: ['M6 3.5h12v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2v-17Z', 'M9 8h6M9 11h6M9 14h4M15 14h1'],
  account_balance_wallet: ['M4 7.5A2.5 2.5 0 0 1 6.5 5H18v4H7a2 2 0 0 0 0 4h13v6H6.5A2.5 2.5 0 0 1 4 16.5v-9Z', 'M16 13h4v4h-4a2 2 0 0 1 0-4Z'],
  badge: ['M7 5.5A2.5 2.5 0 0 1 9.5 3h5A2.5 2.5 0 0 1 17 5.5V7h1.5A1.5 1.5 0 0 1 20 8.5v10A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7H7V5.5Z', 'M9 7h6V5.5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0-.5.5V7Z', 'M9 13h6M10 16h4'],
  monitoring: ['M4 19h16', 'M6 15l3-3 3 2 5-7', 'M7 19v-4M12 19v-5M17 19V8'],
  tune: ['M4 7h10M18 7h2M14 5v4', 'M4 12h3M11 12h9M8 10v4', 'M4 17h12M19 17h1M16 15v4'],
  manage_accounts: ['M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M3.5 20c.8-3.6 3-5.7 6-5.7 1.5 0 2.8.5 3.8 1.5', 'M17 13.5v1.7M17 20.8v-1.7M13.7 15.4l1.5.9M18.8 18.4l1.5.9M13.7 18.4l1.5-.9M18.8 16.3l1.5-.9', 'M17 18.8a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2Z'],
  health_and_safety: ['M12 3.5 19 6v5.3c0 4.1-2.8 7.6-7 9.2-4.2-1.6-7-5.1-7-9.2V6l7-2.5Z', 'M12 8v7M8.5 11.5h7'],
  add: ['M12 5v14M5 12h14'],
  person_add: ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M3.5 20c.8-3.5 2.8-5.5 5.5-5.5 1.2 0 2.2.4 3.1 1', 'M17 9v7M13.5 12.5h7'],
  search: ['M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21', 'M10.5 5.5a5 5 0 0 0-5 5'],
  notifications: ['M18 16H6l1.3-2V10a4.7 4.7 0 0 1 3.6-4.6V4a1.1 1.1 0 0 1 2.2 0v1.4A4.7 4.7 0 0 1 16.7 10v4L18 16Z', 'M10 18a2 2 0 0 0 4 0'],
  trending_up: ['M4 16l5-5 4 4 7-8', 'M15 7h5v5'],
  event_available: ['M7 3v3M17 3v3M5 8h14', 'M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z', 'M8 14l2.5 2.5L16 11'],
  schedule: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2'],
  warning: ['M12 4 21 20H3L12 4Z', 'M12 9v5M12 17h.01'],
  workspace_premium: ['M12 3.5l2.2 4.5 4.9.7-3.5 3.4.8 4.8L12 14.6 7.6 17l.8-4.8L4.9 8.8l4.9-.7L12 3.5Z', 'M8 20h8M10 17.5h4'],
}

export function AdminIcon({ name, className = '', title }: AdminIconProps) {
  const paths = iconPaths[name] ?? iconPaths.dashboard
  const pathList = Array.isArray(paths) ? paths : [paths]

  return (
    <svg
      className={className || 'admin-svg-icon'}
      viewBox='0 0 24 24'
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      {title ? <title>{title}</title> : null}
      {pathList.map(path => (
        <path key={path} d={path} stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
      ))}
    </svg>
  )
}
