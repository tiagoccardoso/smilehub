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
