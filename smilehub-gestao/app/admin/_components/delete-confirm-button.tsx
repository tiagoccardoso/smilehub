'use client'

import { useFormStatus } from 'react-dom'

export function DeleteConfirmButton({ label = 'Excluir', message = 'Tem certeza que deseja excluir este registro?' }: { label?: string; message?: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      className='rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
      type='submit'
      disabled={pending}
      onClick={event => {
        if (!window.confirm(message)) event.preventDefault()
      }}>
      {pending ? 'Excluindo...' : label}
    </button>
  )
}
