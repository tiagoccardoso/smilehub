export const TOOTH_CODES = [
  '18', '17', '16', '15', '14', '13', '12', '11',
  '21', '22', '23', '24', '25', '26', '27', '28',
  '48', '47', '46', '45', '44', '43', '42', '41',
  '31', '32', '33', '34', '35', '36', '37', '38',
] as const

export type ToothCode = typeof TOOTH_CODES[number]
export type ToothArch = 'upper' | 'lower'
export type ToothSide = 'right' | 'left'
export type ToothKind = 'incisor' | 'canine' | 'premolar' | 'molar'

export type ToothConfig = {
  number: ToothCode
  arch: ToothArch
  side: ToothSide
  type: ToothKind
  image: string
}

export const ODONTOGRAM_TEETH = [
  { number: '18', arch: 'upper', side: 'right', type: 'molar', image: '/assets/odontogram/teeth/tooth-18.png' },
  { number: '17', arch: 'upper', side: 'right', type: 'molar', image: '/assets/odontogram/teeth/tooth-17.png' },
  { number: '16', arch: 'upper', side: 'right', type: 'molar', image: '/assets/odontogram/teeth/tooth-16.png' },
  { number: '15', arch: 'upper', side: 'right', type: 'premolar', image: '/assets/odontogram/teeth/tooth-15.png' },
  { number: '14', arch: 'upper', side: 'right', type: 'premolar', image: '/assets/odontogram/teeth/tooth-14.png' },
  { number: '13', arch: 'upper', side: 'right', type: 'canine', image: '/assets/odontogram/teeth/tooth-13.png' },
  { number: '12', arch: 'upper', side: 'right', type: 'incisor', image: '/assets/odontogram/teeth/tooth-12.png' },
  { number: '11', arch: 'upper', side: 'right', type: 'incisor', image: '/assets/odontogram/teeth/tooth-11.png' },
  { number: '21', arch: 'upper', side: 'left', type: 'incisor', image: '/assets/odontogram/teeth/tooth-21.png' },
  { number: '22', arch: 'upper', side: 'left', type: 'incisor', image: '/assets/odontogram/teeth/tooth-22.png' },
  { number: '23', arch: 'upper', side: 'left', type: 'canine', image: '/assets/odontogram/teeth/tooth-23.png' },
  { number: '24', arch: 'upper', side: 'left', type: 'premolar', image: '/assets/odontogram/teeth/tooth-24.png' },
  { number: '25', arch: 'upper', side: 'left', type: 'premolar', image: '/assets/odontogram/teeth/tooth-25.png' },
  { number: '26', arch: 'upper', side: 'left', type: 'molar', image: '/assets/odontogram/teeth/tooth-26.png' },
  { number: '27', arch: 'upper', side: 'left', type: 'molar', image: '/assets/odontogram/teeth/tooth-27.png' },
  { number: '28', arch: 'upper', side: 'left', type: 'molar', image: '/assets/odontogram/teeth/tooth-28.png' },
  { number: '48', arch: 'lower', side: 'right', type: 'molar', image: '/assets/odontogram/teeth/tooth-48.png' },
  { number: '47', arch: 'lower', side: 'right', type: 'molar', image: '/assets/odontogram/teeth/tooth-47.png' },
  { number: '46', arch: 'lower', side: 'right', type: 'molar', image: '/assets/odontogram/teeth/tooth-46.png' },
  { number: '45', arch: 'lower', side: 'right', type: 'premolar', image: '/assets/odontogram/teeth/tooth-45.png' },
  { number: '44', arch: 'lower', side: 'right', type: 'premolar', image: '/assets/odontogram/teeth/tooth-44.png' },
  { number: '43', arch: 'lower', side: 'right', type: 'canine', image: '/assets/odontogram/teeth/tooth-43.png' },
  { number: '42', arch: 'lower', side: 'right', type: 'incisor', image: '/assets/odontogram/teeth/tooth-42.png' },
  { number: '41', arch: 'lower', side: 'right', type: 'incisor', image: '/assets/odontogram/teeth/tooth-41.png' },
  { number: '31', arch: 'lower', side: 'left', type: 'incisor', image: '/assets/odontogram/teeth/tooth-31.png' },
  { number: '32', arch: 'lower', side: 'left', type: 'incisor', image: '/assets/odontogram/teeth/tooth-32.png' },
  { number: '33', arch: 'lower', side: 'left', type: 'canine', image: '/assets/odontogram/teeth/tooth-33.png' },
  { number: '34', arch: 'lower', side: 'left', type: 'premolar', image: '/assets/odontogram/teeth/tooth-34.png' },
  { number: '35', arch: 'lower', side: 'left', type: 'premolar', image: '/assets/odontogram/teeth/tooth-35.png' },
  { number: '36', arch: 'lower', side: 'left', type: 'molar', image: '/assets/odontogram/teeth/tooth-36.png' },
  { number: '37', arch: 'lower', side: 'left', type: 'molar', image: '/assets/odontogram/teeth/tooth-37.png' },
  { number: '38', arch: 'lower', side: 'left', type: 'molar', image: '/assets/odontogram/teeth/tooth-38.png' },
] as const satisfies readonly ToothConfig[]

export const ODONTOGRAM_STATUS = [
  { value: 'planned', label: 'Planejado' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'canceled', label: 'Observação' },
] as const

export const ODONTOGRAM_STATUS_LEGEND = [
  { value: 'healthy', label: 'Saudável' },
  ...ODONTOGRAM_STATUS,
  { value: 'extracted', label: 'Extraído' },
] as const

export const ODONTOGRAM_STATUS_STYLES: Record<string, {
  dot: string
  bg: string
  border: string
  text: string
  ring: string
}> = {
  healthy: {
    dot: 'bg-emerald-400',
    bg: 'bg-white',
    border: 'border-slate-200',
    text: 'text-slate-600',
    ring: 'ring-emerald-100',
  },
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
    dot: 'bg-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-800',
    ring: 'ring-emerald-200',
  },
  canceled: {
    dot: 'bg-violet-500',
    bg: 'bg-violet-50',
    border: 'border-violet-300',
    text: 'text-violet-800',
    ring: 'ring-violet-200',
  },
  observation: {
    dot: 'bg-violet-500',
    bg: 'bg-violet-50',
    border: 'border-violet-300',
    text: 'text-violet-800',
    ring: 'ring-violet-200',
  },
  extracted: {
    dot: 'bg-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-400',
    text: 'text-slate-800',
    ring: 'ring-slate-300',
  },
}

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
