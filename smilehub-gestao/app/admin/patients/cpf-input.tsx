'use client'

import { useMemo, useState } from 'react'
import { formatCpf, isValidCpf, onlyCpfDigits } from '@/lib/cpf'

type CpfInputProps = {
  id?: string
  name?: string
  defaultValue?: string | null
  required?: boolean
  placeholder?: string
  className?: string
  labelClassName?: string
}

export function CpfInput({
  id,
  name = 'cpf',
  defaultValue,
  required = false,
  placeholder = 'CPF',
  className = 'space-y-1',
  labelClassName,
}: CpfInputProps) {
  const initialValue = useMemo(() => formatCpf(defaultValue), [defaultValue])
  const [value, setValue] = useState(initialValue)
  const digits = onlyCpfDigits(value)
  const emptyRequired = required && digits.length === 0
  const invalid = digits.length > 0 && digits.length === 11 && !isValidCpf(digits)
  const incomplete = digits.length > 0 && digits.length < 11
  const inputId = id || `${name}-input`
  const helpId = `${inputId}-help`

  return (
    <label className={className} htmlFor={inputId}>
      <span className={labelClassName}>{placeholder}{required ? <strong className='required-mark' aria-hidden='true'> *</strong> : null}</span>
      <input
        id={inputId}
        name={name}
        inputMode='numeric'
        autoComplete='off'
        placeholder='000.000.000-00'
        value={value}
        onChange={event => setValue(formatCpf(event.target.value))}
        aria-invalid={emptyRequired || invalid || incomplete || undefined}
        aria-describedby={helpId}
        required={required}
      />
      <span id={helpId} className={`block text-xs leading-5 ${emptyRequired || invalid || incomplete ? 'text-red-700' : 'text-slate-500'}`}>
        {emptyRequired
          ? 'Informe o CPF do paciente.'
          : invalid
            ? 'CPF inválido. Verifique os dígitos informados.'
            : incomplete
              ? 'Digite os 11 números do CPF.'
              : 'CPF informado será usado para identificação e documentos da clínica.'}
      </span>
    </label>
  )
}
