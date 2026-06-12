'use client'
import { useFormStatus } from 'react-dom'

export function SubmitButton({ label = 'Salvar' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <button className='btn min-w-[180px]' type='submit' disabled={pending} aria-busy={pending}>
      {pending ? 'Salvando...' : label}
    </button>
  )
}
