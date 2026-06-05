export const ADULT_TOOTH_CODES = [
  '18', '17', '16', '15', '14', '13', '12', '11',
  '21', '22', '23', '24', '25', '26', '27', '28',
  '48', '47', '46', '45', '44', '43', '42', '41',
  '31', '32', '33', '34', '35', '36', '37', '38',
] as const

export const CHILD_TOOTH_CODES = [
  '55', '54', '53', '52', '51',
  '61', '62', '63', '64', '65',
  '85', '84', '83', '82', '81',
  '71', '72', '73', '74', '75',
] as const

export const TOOTH_CODES = [...ADULT_TOOTH_CODES, ...CHILD_TOOTH_CODES] as const

export type AdultToothCode = typeof ADULT_TOOTH_CODES[number]
export type ChildToothCode = typeof CHILD_TOOTH_CODES[number]
export type ToothCode = typeof TOOTH_CODES[number]
export type ToothArch = 'upper' | 'lower'
export type ToothSide = 'right' | 'left'
export type ToothKind = 'incisor' | 'canine' | 'premolar' | 'molar'
export type OdontogramChartId = 'adult' | 'children'

export type ToothConfig = {
  number: ToothCode
  arch: ToothArch
  side: ToothSide
  type: ToothKind
  image: string
}

export type OdontogramChart = {
  id: OdontogramChartId
  label: string
  title: string
  description: string
  teeth: readonly ToothConfig[]
  columns: number
  compact?: boolean
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

export const PEDIATRIC_ODONTOGRAM_TEETH = [
  { number: '55', arch: 'upper', side: 'right', type: 'molar', image: '/assets/odontogram/children/tooth-55.png' },
  { number: '54', arch: 'upper', side: 'right', type: 'molar', image: '/assets/odontogram/children/tooth-54.png' },
  { number: '53', arch: 'upper', side: 'right', type: 'canine', image: '/assets/odontogram/children/tooth-53.png' },
  { number: '52', arch: 'upper', side: 'right', type: 'incisor', image: '/assets/odontogram/children/tooth-52.png' },
  { number: '51', arch: 'upper', side: 'right', type: 'incisor', image: '/assets/odontogram/children/tooth-51.png' },
  { number: '61', arch: 'upper', side: 'left', type: 'incisor', image: '/assets/odontogram/children/tooth-61.png' },
  { number: '62', arch: 'upper', side: 'left', type: 'incisor', image: '/assets/odontogram/children/tooth-62.png' },
  { number: '63', arch: 'upper', side: 'left', type: 'canine', image: '/assets/odontogram/children/tooth-63.png' },
  { number: '64', arch: 'upper', side: 'left', type: 'molar', image: '/assets/odontogram/children/tooth-64.png' },
  { number: '65', arch: 'upper', side: 'left', type: 'molar', image: '/assets/odontogram/children/tooth-65.png' },
  { number: '85', arch: 'lower', side: 'right', type: 'molar', image: '/assets/odontogram/children/tooth-85.png' },
  { number: '84', arch: 'lower', side: 'right', type: 'molar', image: '/assets/odontogram/children/tooth-84.png' },
  { number: '83', arch: 'lower', side: 'right', type: 'canine', image: '/assets/odontogram/children/tooth-83.png' },
  { number: '82', arch: 'lower', side: 'right', type: 'incisor', image: '/assets/odontogram/children/tooth-82.png' },
  { number: '81', arch: 'lower', side: 'right', type: 'incisor', image: '/assets/odontogram/children/tooth-81.png' },
  { number: '71', arch: 'lower', side: 'left', type: 'incisor', image: '/assets/odontogram/children/tooth-71.png' },
  { number: '72', arch: 'lower', side: 'left', type: 'incisor', image: '/assets/odontogram/children/tooth-72.png' },
  { number: '73', arch: 'lower', side: 'left', type: 'canine', image: '/assets/odontogram/children/tooth-73.png' },
  { number: '74', arch: 'lower', side: 'left', type: 'molar', image: '/assets/odontogram/children/tooth-74.png' },
  { number: '75', arch: 'lower', side: 'left', type: 'molar', image: '/assets/odontogram/children/tooth-75.png' },
] as const satisfies readonly ToothConfig[]

export const ODONTOGRAM_CHARTS = [
  {
    id: 'adult',
    label: 'Adulto',
    title: 'Odontograma adulto',
    description: 'Dentição permanente no padrão FDI, preservando o fluxo atual do sistema.',
    teeth: ODONTOGRAM_TEETH,
    columns: 16,
  },
  {
    id: 'children',
    label: 'Crianças',
    title: 'Odontograma infantil',
    description: 'Dentição decídua infantil no padrão FDI, com dentes individuais e clicáveis.',
    teeth: PEDIATRIC_ODONTOGRAM_TEETH,
    columns: 10,
    compact: true,
  },
] as const satisfies readonly OdontogramChart[]

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
  cpf?: string | null
  birth_date?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  guardian_name?: string | null
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
  created_by_name?: string | null
  created_at: string
  updated_at: string
}

export type OdontogramTerm = {
  id: string
  patient_id: string
  patient_name: string
  chart_type: OdontogramChartId
  child_name: string | null
  birth_or_age: string | null
  guardian_name: string | null
  guardian_document: string | null
  guardian_phone: string | null
  relationship: string | null
  authorization_date: string | null
  professional_name: string | null
  authorized_procedures: string | null
  term_text: string | null
  related_teeth: string[] | null
  signature_data_url: string | null
  status: string
  version: number
  parent_term_id: string | null
  created_by_name: string | null
  updated_by_name: string | null
  created_at: string
  updated_at: string
}
