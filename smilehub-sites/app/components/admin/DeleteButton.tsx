import { useState } from 'react'

export default function DeleteButton({
  label,
  onDelete,
}: {
  label: string
  onDelete: () => void
}) {
  const [showConfirmar, setShowConfirmar] = useState(false)

  if (showConfirmar) {
    return (
      <div className='fixed bg-black/80 inset-0 flex items-center h-full justify-center'>
        <div className='bg-white p-4 rounded-lg'>
          <div>Tem certeza de que deseja excluir?</div>
          <div className='flex gap-2 mt-4'>
            <button
              type='button'
              className='btn'
              onClick={() => setShowConfirmar(false)}>
              Cancelar
            </button>
            <button
              onClick={() => {
                onDelete()
                setShowConfirmar(false)
              }}
              type='button'
              className='p-2 bg-red-500 text-white rounded hover:bg-red-700'>
              Sim,&nbsp;excluir!
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      type='button'
      className='p-2 bg-red-500 text-white rounded hover:bg-red-700'
      onClick={() => setShowConfirmar(true)}>
      {label}
    </button>
  )
}
