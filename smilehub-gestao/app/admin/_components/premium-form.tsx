import type { ReactNode } from 'react'

export const adminFormGridClass = 'admin-form-grid'
export const adminFormCardClass = 'admin-form-card'
export const adminInlineActionsClass = 'admin-form-actions'

export function AdminFormHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className='admin-form-header'>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  )
}

export function AdminField({
  label,
  required,
  children,
  className = '',
  hint,
}: {
  label: string
  required?: boolean
  children: ReactNode
  className?: string
  hint?: string
}) {
  return (
    <label className={`admin-form-field ${className}`}>
      <span className='admin-form-label'>
        {label}
        {required ? <strong className='required-mark' aria-hidden='true'>*</strong> : null}
      </span>
      {children}
      {hint ? <span className='admin-form-hint'>{hint}</span> : null}
    </label>
  )
}

export function AdminCheckboxField({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <label className={`admin-checkbox-field ${className}`}>{children}</label>
}
