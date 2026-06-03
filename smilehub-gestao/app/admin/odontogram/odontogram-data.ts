export const TOOTH_CODES = [
  '18', '17', '16', '15', '14', '13', '12', '11',
  '21', '22', '23', '24', '25', '26', '27', '28',
  '48', '47', '46', '45', '44', '43', '42', '41',
  '31', '32', '33', '34', '35', '36', '37', '38',
] as const

export const ODONTOGRAM_STATUS = [
  { value: 'planned', label: 'Planejado' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'canceled', label: 'Cancelado' },
] as const

export const ODONTOGRAM_STATUS_STYLES: Record<string, {
  dot: string
  bg: string
  border: string
  text: string
  ring: string
}> = {
  planned: {
    dot: 'bg-sky-500',
    bg: 'bg-sky-50',
    border: 'border-sky-300',
    text: 'text-sky-800',
    ring: 'ring-sky-200',
  },
  in_progress: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-900',
    ring: 'ring-amber-200',
  },
  completed: {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-800',
    ring: 'ring-emerald-200',
  },
  canceled: {
    dot: 'bg-rose-500',
    bg: 'bg-rose-50',
    border: 'border-rose-300',
    text: 'text-rose-800',
    ring: 'ring-rose-200',
  },
}

export type ToothCode = typeof TOOTH_CODES[number]

export type PatientOption = {
  id: string
  full_name: string
}

export type ProcedureOption = {
  id: string
  name: string
}

export type OdontogramEntry = {
  id: string
  patient_id: string
  patient_name: string
  tooth_code: ToothCode
  condition: string | null
  procedure_id: string | null
  procedure_name: string | null
  planned_procedure: string | null
  performed_procedure: string | null
  notes: string | null
  status: string
  scheduled_date: string | null
  created_at: string
  updated_at: string
}
