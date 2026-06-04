'use client'

import { useMemo, useState } from 'react'
import { formatCpf, isValidCpf, onlyCpfDigits } from '@/lib/cpf'

type CpfInputProps = {
  name?: string
  defaultValue?: string | null
  required?: boolean
  placeholder?: string
}

export function CpfInput({ name = 'cpf', defaultValue, required = false, placeholder = 'CPF' }: CpfInputProps) {
  const initialValue = useMemo(() => formatCpf(defaultValue), [defaultValue])
  const [value, setValue] = useState(initialValue)
  const digits = onlyCpfDigits(value)
  const invalid = digits.length > 0 && digits.length === 11 && !isValidCpf(digits)
  const incomplete = digits.length > 0 && digits.length < 11

  return (
    <label className='space-y-1'>
      <span>{placeholder}{required ? <strong className='required-mark' aria-hidden='true'> *</strong> : null}</span>
      <input
        name={name}
        inputMode='numeric'
        autoComplete='off'
        placeholder='000.000.000-00'
        value={value}
        onChange={event => setValue(formatCpf(event.target.value))}
        aria-invalid={invalid || incomplete || undefined}
        aria-describedby={`${name}-cpf-help`}
        required={required}
      />
      <span id={`${name}-cpf-help`} className={`block text-xs ${invalid || incomplete ? 'text-red-700' : 'text-slate-500'}`}>
        {invalid ? 'CPF inválido. Verifique os dígitos informados.' : incomplete ? 'Digite os 11 números do CPF.' : 'O CPF será salvo somente com números.'}
      </span>
    </label>
  )
}
