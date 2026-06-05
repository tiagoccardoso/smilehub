'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SubmitButton } from '../_components/submit-button'
import {
  ODONTOGRAM_CHARTS,
  ODONTOGRAM_STATUS,
  ODONTOGRAM_STATUS_LEGEND,
  ODONTOGRAM_STATUS_STYLES,
  type OdontogramChart,
  type OdontogramChartId,
  type OdontogramEntry,
  type PatientOption,
  type ProcedureOption,
  type ToothCode,
  type ToothConfig,
} from './odontogram-data'

type Action = (formData: FormData) => void | Promise<void>

type OdontogramClientProps = {
  patients: PatientOption[]
  procedures: ProcedureOption[]
  entries: OdontogramEntry[]
  selectedPatientId: string
  initialTab: OdontogramChartId
  saveAction: Action
  deleteAction: Action
}


type ResponsibilityTerm = {
  childName: string
  birthOrAge: string
  guardianName: string
  guardianDocument: string
  guardianPhone: string
  relationship: string
  authorizedProcedures: string
  authorizationDate: string
  professionalName: string
  termText: string
}

const emptyStatusStyle = {
  dot: 'bg-slate-300',
  bg: 'bg-white',
  border: 'border-slate-200',
  text: 'text-slate-600',
  ring: 'ring-slate-200',
}

const chartsById = new Map<OdontogramChartId, OdontogramChart>(ODONTOGRAM_CHARTS.map(chart => [chart.id, chart] as const))
const allTeeth = ODONTOGRAM_CHARTS.flatMap(chart => [...chart.teeth])
const teethByNumber = new Map<ToothCode, ToothConfig>(allTeeth.map(tooth => [tooth.number, tooth] as const))

function normalizeDate(value: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function formatDate(value: string | null) {
  const normalized = normalizeDate(value)
  if (!normalized) return 'Sem data'
  const [year, month, day] = normalized.split('-')
  return `${day}/${month}/${year}`
}

function normalizeClinicalText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isExtractedEntry(entry?: OdontogramEntry) {
  if (!entry) return false
  const searchableText = normalizeClinicalText([
    entry.condition,
    entry.procedure_name,
    entry.planned_procedure,
    entry.performed_procedure,
    entry.notes,
  ].filter(Boolean).join(' '))

  return /\b(extracao|extraido|exodontia|extrair|exodontico)\b/.test(searchableText)
}

function statusLabel(status: string) {
  return ODONTOGRAM_STATUS.find(item => item.value === status)?.label ?? status
}

function entryProcedure(entry: OdontogramEntry) {
  return entry.procedure_name || entry.planned_procedure || entry.performed_procedure || 'Procedimento sem descrição'
}

function toothVisualStatus(activeEntry?: OdontogramEntry) {
  if (!activeEntry) return { key: 'healthy', label: 'Saudável' }
  if (isExtractedEntry(activeEntry)) return { key: 'extracted', label: 'Extraído' }
  if (activeEntry.status === 'canceled') return { key: 'observation', label: 'Observação' }

  return { key: activeEntry.status, label: statusLabel(activeEntry.status) }
}

function statusStyle(status?: string | null) {
  return status ? ODONTOGRAM_STATUS_STYLES[status] ?? emptyStatusStyle : emptyStatusStyle
}

function groupEntriesByTooth(entries: OdontogramEntry[]) {
  const grouped = new Map<string, OdontogramEntry[]>()
  entries.forEach(entry => grouped.set(entry.tooth_code, [...(grouped.get(entry.tooth_code) ?? []), entry]))
  return grouped
}

function sanitizePrintText(value: string) {
  return value.trim() || '________________________________________'
}

function ToothButton({
  tooth,
  activeEntry,
  selected,
  disabled,
  compact,
  onSelect,
}: {
  tooth: ToothConfig
  activeEntry?: OdontogramEntry
  selected: boolean
  disabled: boolean
  compact?: boolean
  onSelect: (code: ToothCode) => void
}) {
  const hasEntry = Boolean(activeEntry)
  const visualStatus = toothVisualStatus(activeEntry)
  const style = statusStyle(visualStatus.key)
  const sizeClasses = compact
    ? 'min-h-[8rem] min-w-[3.25rem] sm:min-h-[9.25rem] sm:min-w-[3.8rem]'
    : 'min-h-[8.75rem] min-w-[3.45rem] sm:min-h-[10.25rem] sm:min-w-[4.35rem]'
  const imageClasses = compact
    ? 'h-16 max-h-24 max-w-[3.8rem] sm:h-20 sm:max-w-[4.4rem]'
    : 'h-[4.5rem] max-h-28 max-w-[4.2rem] sm:h-24 sm:max-w-[5rem]'

  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() => onSelect(tooth.number)}
      className={`group relative flex ${sizeClasses} snap-center flex-col items-center justify-between overflow-visible rounded-2xl border px-1.5 py-2 transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${hasEntry ? `${style.bg} ${style.border}` : 'border-slate-200 bg-gradient-to-b from-white to-slate-50'} ${selected ? `ring-4 ${style.ring} border-blue-500 shadow-lg` : 'shadow-sm'}`}
      aria-label={`Selecionar dente ${tooth.number}. Status: ${visualStatus.label}`}
      aria-pressed={selected}
      data-tooth-status={visualStatus.key}
    >
      <span className={`absolute right-2 top-2 h-3 w-3 rounded-full ${style.dot}`} aria-hidden='true' />
      {tooth.arch === 'upper' ? <span className='text-xs font-bold text-slate-800'>{tooth.number}</span> : <span className='h-4' aria-hidden='true' />}
      <span className={`${compact ? 'min-h-[5.5rem]' : 'min-h-[6.6rem] sm:min-h-[7.5rem]'} flex w-full items-center justify-center`}>
        <img
          src={tooth.image}
          alt={`Imagem realista do dente ${tooth.number}`}
          className={`odontogram-tooth-image ${imageClasses} w-full object-contain transition duration-200 group-hover:scale-105`}
          draggable={false}
        />
      </span>
      {tooth.arch === 'lower' ? <span className='text-xs font-bold text-slate-800'>{tooth.number}</span> : null}
      <span className={`mt-1 rounded-full px-2 py-0.5 text-center text-[10px] font-extrabold leading-tight ${style.bg} ${style.text}`}>
        {visualStatus.label}
      </span>
    </button>
  )
}

function StatusLegend() {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
      <p className='text-xs font-extrabold uppercase tracking-wide text-slate-500'>Legenda de status</p>
      <div className='mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6'>
        {ODONTOGRAM_STATUS_LEGEND.map(status => {
          const style = statusStyle(status.value)
          return (
            <div key={status.value} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${style.bg} ${style.border} ${style.text}`}>
              <span className={`h-3 w-3 rounded-full ${style.dot}`} aria-hidden='true' />
              <span>{status.label}</span>
            </div>
          )
        })}
      </div>
      <p className='mt-2 text-xs text-slate-500'>Dentes sem registro aparecem como saudáveis. Registros com termos como extração, extraído ou exodontia recebem o destaque visual de Extraído sem alterar a estrutura do banco de dados.</p>
    </div>
  )
}

function ArcSection({
  title,
  chart,
  teeth,
  entriesByTooth,
  selectedTooth,
  disabled,
  onSelect,
}: {
  title: string
  chart: OdontogramChart
  teeth: readonly ToothConfig[]
  entriesByTooth: Map<string, OdontogramEntry[]>
  selectedTooth: ToothCode | null
  disabled: boolean
  onSelect: (code: ToothCode) => void
}) {
  return (
    <section className='rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4'>
      <div className='mb-4 flex items-center gap-3'>
        <span className='h-px flex-1 bg-slate-200' />
        <h2 className='text-center text-xs font-extrabold uppercase tracking-[0.2em] text-slate-600 sm:text-sm'>{title}</h2>
        <span className='h-px flex-1 bg-slate-200' />
      </div>
      <p className='mb-2 text-center text-[11px] font-semibold text-slate-500 sm:hidden'>Arraste lateralmente para ver todos os dentes.</p>
      <div className='odontogram-arc-scroll overflow-x-auto pb-2' aria-label={`${title} do ${chart.title}`}>
        <div
          className='grid snap-x gap-1.5 sm:gap-2'
          style={{ gridTemplateColumns: `repeat(${teeth.length}, minmax(${chart.compact ? '3rem' : '3.15rem'}, 1fr))`, minWidth: chart.compact ? '31rem' : '49rem' }}
        >
          {teeth.map(tooth => (
            <ToothButton
              key={tooth.number}
              tooth={tooth}
              activeEntry={entriesByTooth.get(tooth.number)?.[0]}
              selected={selectedTooth === tooth.number}
              disabled={disabled}
              compact={chart.compact}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function ChartTabs({ activeChartId, onChange }: { activeChartId: OdontogramChartId; onChange: (chartId: OdontogramChartId) => void }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-2 shadow-sm' role='tablist' aria-label='Tipo de odontograma'>
      <div className='grid gap-2 sm:grid-cols-2'>
        {ODONTOGRAM_CHARTS.map(chart => {
          const active = chart.id === activeChartId
          return (
            <button
              key={chart.id}
              type='button'
              role='tab'
              aria-selected={active}
              onClick={() => onChange(chart.id)}
              className={`rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${active ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-slate-50'}`}
            >
              <span className='block text-sm font-extrabold'>{chart.label}</span>
              <span className='mt-1 block text-xs text-slate-600'>{chart.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PrintActions({ chart, disabled, onPrint }: { chart: OdontogramChart; disabled: boolean; onPrint: () => void }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h2 className='text-base font-bold'>Impressão</h2>
          <p className='text-sm text-slate-600'>Gere uma versão A4 preenchida do odontograma {chart.id === 'children' ? 'infantil com termo e assinatura' : 'adulto'}.</p>
        </div>
        <div className='grid gap-2 sm:grid-cols-1 lg:flex lg:flex-wrap lg:justify-end'>
          <button type='button' onClick={onPrint} disabled={disabled} className='rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300' aria-label={`Imprimir ${chart.title}`}>
            Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}

function ResponsibilityTermSection({
  chart,
  term,
  onChange,
  suggestedProcedures,
  aiLoading,
  aiFeedback,
  onGenerateSuggestion,
}: {
  chart: OdontogramChart
  term: ResponsibilityTerm
  onChange: (field: keyof ResponsibilityTerm, value: string) => void
  suggestedProcedures: string
  aiLoading: boolean
  aiFeedback: { type: 'success' | 'error' | 'info'; message: string } | null
  onGenerateSuggestion: () => void
}) {
  const isChild = chart.id === 'children'

  return (
    <section className='rounded-3xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm sm:p-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-xs font-extrabold uppercase tracking-wide text-emerald-700'>Termo e IA DeepSeek</p>
          <h2 className='text-xl font-bold text-slate-900'>{isChild ? 'Responsabilidade e autorização do responsável' : 'Termo de ciência/autorização do paciente'}</h2>
          <p className='mt-1 max-w-3xl text-sm text-slate-600'>Use a IA apenas como apoio textual. Revise e edite o texto antes de imprimir ou coletar assinatura.</p>
        </div>
        <button
          type='button'
          onClick={onGenerateSuggestion}
          disabled={aiLoading}
          className='inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300'
        >
          {aiLoading ? 'Gerando sugestão...' : 'Sugerir termo com IA'}
        </button>
      </div>

      {aiFeedback ? (
        <p className={`mt-3 rounded-xl border px-3 py-2 text-sm ${aiFeedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-white text-emerald-800'}`}>
          {aiFeedback.message}
        </p>
      ) : null}

      <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
        {isChild ? (
          <>
            <label className='space-y-1'>
              <span>Nome da criança</span>
              <input type='text' value={term.childName} onChange={event => onChange('childName', event.target.value)} placeholder='Nome completo da criança' aria-label='Nome da criança' />
            </label>
            <label className='space-y-1'>
              <span>Data de nascimento ou idade</span>
              <input type='text' value={term.birthOrAge} onChange={event => onChange('birthOrAge', event.target.value)} placeholder='Ex.: 10/05/2018 ou 8 anos' aria-label='Data de nascimento ou idade da criança' />
            </label>
            <label className='space-y-1'>
              <span>Nome do responsável</span>
              <input type='text' value={term.guardianName} onChange={event => onChange('guardianName', event.target.value)} placeholder='Nome completo do responsável' aria-label='Nome do responsável' />
            </label>
            <label className='space-y-1'>
              <span>CPF/RG do responsável</span>
              <input type='text' value={term.guardianDocument} onChange={event => onChange('guardianDocument', event.target.value)} placeholder='CPF ou RG' aria-label='CPF ou RG do responsável' />
            </label>
            <label className='space-y-1'>
              <span>Telefone do responsável</span>
              <input type='tel' value={term.guardianPhone} onChange={event => onChange('guardianPhone', event.target.value)} placeholder='(00) 00000-0000' aria-label='Telefone do responsável' />
            </label>
            <label className='space-y-1'>
              <span>Grau de parentesco</span>
              <input type='text' value={term.relationship} onChange={event => onChange('relationship', event.target.value)} placeholder='Ex.: mãe, pai, avó, tutor legal' aria-label='Grau de parentesco' />
            </label>
          </>
        ) : null}
        <label className='space-y-1'>
          <span>Data da autorização</span>
          <input type='date' value={term.authorizationDate} onChange={event => onChange('authorizationDate', event.target.value)} aria-label='Data da autorização' />
        </label>
        <label className='space-y-1 xl:col-span-2'>
          <span>Profissional responsável</span>
          <input type='text' value={term.professionalName} onChange={event => onChange('professionalName', event.target.value)} placeholder='Nome e registro profissional, se aplicável' aria-label='Profissional responsável' />
        </label>
        <label className='space-y-1 sm:col-span-2 xl:col-span-3'>
          <span>{isChild ? 'Procedimentos autorizados' : 'Procedimentos/observações para o termo'}</span>
          <textarea rows={4} value={term.authorizedProcedures} onChange={event => onChange('authorizedProcedures', event.target.value)} placeholder={suggestedProcedures || 'Descreva os procedimentos para constar no termo.'} aria-label='Procedimentos para o termo' />
        </label>
        <label className='space-y-1 sm:col-span-2 xl:col-span-3'>
          <span>Texto do termo gerado/revisado</span>
          <textarea rows={7} value={term.termText} onChange={event => onChange('termText', event.target.value)} placeholder='Clique em “Sugerir termo com IA” ou escreva o texto manualmente. O conteúdo ficará editável antes da impressão.' aria-label='Texto do termo de responsabilidade ou autorização' />
        </label>
      </div>
    </section>
  )
}

function PrintTooth({ tooth, entry }: { tooth: ToothConfig; entry?: OdontogramEntry }) {
  const visualStatus = toothVisualStatus(entry)
  const style = statusStyle(visualStatus.key)

  return (
    <div className={`odontogram-print-tooth rounded-xl border p-1 text-center ${entry ? `${style.bg} ${style.border}` : 'border-slate-200 bg-white'}`}>
      <div className='text-[10px] font-bold text-slate-800'>{tooth.number}</div>
      <img src={tooth.image} alt={`Dente ${tooth.number}`} className='mx-auto h-14 w-full object-contain' draggable={false} />
      <div className={`odontogram-print-status mt-1 rounded-full px-1 py-0.5 text-[8px] font-bold ${style.bg} ${style.text}`}>{visualStatus.label}</div>
    </div>
  )
}

function PrintableChart({ chart, entriesByTooth }: { chart: OdontogramChart; entriesByTooth: Map<string, OdontogramEntry[]> }) {
  const upperTeeth = chart.teeth.filter(tooth => tooth.arch === 'upper')
  const lowerTeeth = chart.teeth.filter(tooth => tooth.arch === 'lower')

  return (
    <div className='odontogram-print-chart rounded-2xl border border-slate-300 p-3'>
      {[{ title: 'Arcada superior', teeth: upperTeeth }, { title: 'Arcada inferior', teeth: lowerTeeth }].map(section => (
        <section key={section.title} className='mb-3 last:mb-0'>
          <h3 className='mb-2 text-center text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-600'>{section.title}</h3>
          <div className='grid gap-1' style={{ gridTemplateColumns: `repeat(${section.teeth.length}, minmax(0, 1fr))` }}>
            {section.teeth.map(tooth => <PrintTooth key={tooth.number} tooth={tooth} entry={entriesByTooth.get(tooth.number)?.[0]} />)}
          </div>
        </section>
      ))}
    </div>
  )
}

function PrintableProcedureList({ entries }: { entries: OdontogramEntry[] }) {
  return (
    <div className='odontogram-print-filled-only mt-4'>
      <h3 className='text-sm font-extrabold'>Procedimentos registrados</h3>
      {entries.length ? (
        <table className='mt-2 w-full border-collapse text-xs'>
          <thead>
            <tr>
              <th className='border border-slate-300 p-1 text-left'>Dente</th>
              <th className='border border-slate-300 p-1 text-left'>Procedimento</th>
              <th className='border border-slate-300 p-1 text-left'>Condição</th>
              <th className='border border-slate-300 p-1 text-left'>Status</th>
              <th className='border border-slate-300 p-1 text-left'>Data</th>
              <th className='border border-slate-300 p-1 text-left'>Observações</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id}>
                <td className='border border-slate-300 p-1 font-bold'>{entry.tooth_code}</td>
                <td className='border border-slate-300 p-1'>{entryProcedure(entry)}</td>
                <td className='border border-slate-300 p-1'>{entry.condition || '-'}</td>
                <td className='border border-slate-300 p-1'>{toothVisualStatus(entry).label}</td>
                <td className='border border-slate-300 p-1'>{formatDate(entry.scheduled_date)}</td>
                <td className='border border-slate-300 p-1'>{entry.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className='mt-2 rounded-lg border border-slate-300 p-2 text-xs'>Nenhum procedimento registrado.</p>}
    </div>
  )
}

function PrintableTermDetails({ chart, term, patientName, suggestedProcedures }: { chart: OdontogramChart; term: ResponsibilityTerm; patientName: string; suggestedProcedures: string }) {
  const isChild = chart.id === 'children'
  const fallbackText = isChild
    ? 'Declaro, na condição de responsável legal pela criança identificada neste documento, que recebi as orientações necessárias, pude esclarecer dúvidas e autorizo a realização dos procedimentos odontológicos descritos, conforme avaliação profissional e odontograma preenchido.'
    : 'Declaro que recebi as orientações necessárias, pude esclarecer dúvidas e estou ciente/autorizo os procedimentos odontológicos registrados neste odontograma, conforme avaliação profissional.'
  const termText = term.termText.trim() || fallbackText

  return (
    <div className='odontogram-print-filled-only mt-4 space-y-3'>
      <h3 className='text-sm font-extrabold'>{isChild ? 'Dados da criança, responsável e autorização' : 'Dados do termo de ciência/autorização'}</h3>
      <div className='grid grid-cols-2 gap-2 text-xs'>
        <p><strong>Paciente:</strong> {sanitizePrintText(patientName)}</p>
        {isChild ? <p><strong>Criança:</strong> {sanitizePrintText(term.childName || patientName)}</p> : null}
        {isChild ? <p><strong>Nascimento/idade:</strong> {sanitizePrintText(term.birthOrAge)}</p> : null}
        {isChild ? <p><strong>Responsável:</strong> {sanitizePrintText(term.guardianName)}</p> : null}
        {isChild ? <p><strong>CPF/RG:</strong> {sanitizePrintText(term.guardianDocument)}</p> : null}
        {isChild ? <p><strong>Telefone:</strong> {sanitizePrintText(term.guardianPhone)}</p> : null}
        {isChild ? <p><strong>Parentesco:</strong> {sanitizePrintText(term.relationship)}</p> : null}
        <p><strong>Data:</strong> {term.authorizationDate ? formatDate(term.authorizationDate) : new Date().toLocaleDateString('pt-BR')}</p>
        <p><strong>Profissional:</strong> {sanitizePrintText(term.professionalName)}</p>
      </div>
      <div className='rounded-xl border border-slate-300 p-2 text-xs leading-relaxed'>
        <p><strong>Procedimentos/observações do termo:</strong> {term.authorizedProcedures.trim() || suggestedProcedures || 'Não informado'}</p>
        <p className='mt-2 whitespace-pre-line'>{termText}</p>
        <p className='mt-2 text-[10px] text-slate-600'>Texto de apoio sujeito à revisão clínica/profissional e, quando necessário, jurídica.</p>
      </div>
      <div className='mt-8 grid grid-cols-2 gap-10 text-center text-xs'>
        <div className='border-t border-slate-700 pt-2'>{isChild ? 'Assinatura do responsável' : 'Assinatura do paciente/responsável'}</div>
        <div className='border-t border-slate-700 pt-2'>Assinatura do profissional</div>
      </div>
    </div>
  )
}

function PrintMapArea({ chart, patientName, entries, entriesByTooth, term, suggestedProcedures }: { chart: OdontogramChart; patientName: string; entries: OdontogramEntry[]; entriesByTooth: Map<string, OdontogramEntry[]>; term: ResponsibilityTerm; suggestedProcedures: string }) {
  return (
    <section className='odontogram-print-area odontogram-print-map-only hidden'>
      <header className='mb-4 border-b border-slate-300 pb-3'>
        <p className='text-xs font-bold uppercase tracking-wide text-slate-500'>SmileHub · Odontograma</p>
        <h1 className='text-xl font-extrabold'>{chart.title}</h1>
        <p className='text-sm'>Paciente: <strong>{patientName || 'Não informado'}</strong></p>
        <p className='text-xs text-slate-600'>Data da impressão: {new Date().toLocaleDateString('pt-BR')}</p>
      </header>
      <PrintableChart chart={chart} entriesByTooth={entriesByTooth} />
      <PrintableProcedureList entries={entries} />
      <PrintableTermDetails chart={chart} term={term} patientName={patientName} suggestedProcedures={suggestedProcedures} />
    </section>
  )
}

export function OdontogramClient({ patients, procedures, entries, selectedPatientId, initialTab, saveAction, deleteAction }: OdontogramClientProps) {
  const router = useRouter()
  const initialChart = chartsById.get(initialTab) ?? ODONTOGRAM_CHARTS[0]
  const [activeChartId, setActiveChartId] = useState<OdontogramChartId>(initialChart.id)
  const [selectedTooth, setSelectedTooth] = useState<ToothCode | null>(null)
  const [term, setTerm] = useState<ResponsibilityTerm>({
    childName: '',
    birthOrAge: '',
    guardianName: '',
    guardianDocument: '',
    guardianPhone: '',
    relationship: '',
    authorizedProcedures: '',
    authorizationDate: '',
    professionalName: '',
    termText: '',
  })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const activeChart = chartsById.get(activeChartId) ?? ODONTOGRAM_CHARTS[0]
  const selectedPatient = patients.find(patient => patient.id === selectedPatientId)
  const selectedToothConfig = selectedTooth ? teethByNumber.get(selectedTooth) : null
  const activeToothSet = useMemo(() => new Set(activeChart.teeth.map(tooth => tooth.number)), [activeChart])

  const entriesForCurrentChart = useMemo(() => entries.filter(entry => (!selectedPatientId || entry.patient_id === selectedPatientId) && activeToothSet.has(entry.tooth_code)), [activeToothSet, entries, selectedPatientId])
  const entriesByTooth = useMemo(() => groupEntriesByTooth(entriesForCurrentChart), [entriesForCurrentChart])

  const selectedEntries = selectedTooth ? entriesByTooth.get(selectedTooth) ?? [] : []
  const currentEntry = selectedEntries[0]
  const disabledChart = !selectedPatientId
  const suggestedProcedures = entriesForCurrentChart.map(entry => `Dente ${entry.tooth_code}: ${entryProcedure(entry)} (${toothVisualStatus(entry).label})`).join('; ')

  function changePatient(patientId: string) {
    setSelectedTooth(null)
    router.push(patientId ? `/admin/odontogram?patient_id=${patientId}&tab=${activeChartId}` : `/admin/odontogram?tab=${activeChartId}`)
  }

  function changeChart(chartId: OdontogramChartId) {
    setActiveChartId(chartId)
    setSelectedTooth(null)
    const current = selectedPatientId ? `?patient_id=${selectedPatientId}&tab=${chartId}` : `?tab=${chartId}`
    router.replace(`/admin/odontogram${current}`, { scroll: false })
  }

  function changeTermField(field: keyof ResponsibilityTerm, value: string) {
    setTerm(current => ({ ...current, [field]: value }))
  }

  async function handleGenerateTermSuggestion() {
    if (!selectedPatientId) {
      setAiFeedback({ type: 'error', message: 'Selecione um paciente antes de gerar o termo com IA.' })
      return
    }

    setAiLoading(true)
    setAiFeedback({ type: 'info', message: 'Consultando a DeepSeek com os dados mínimos do odontograma...' })

    try {
      const response = await fetch('/api/admin/odontogram/ai-term', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartType: activeChart.id,
          patientName: selectedPatient?.full_name ?? '',
          childName: term.childName,
          birthOrAge: term.birthOrAge,
          guardianName: term.guardianName,
          relationship: term.relationship,
          professionalName: term.professionalName,
          authorizedProcedures: term.authorizedProcedures,
          observations: term.termText,
          entries: entriesForCurrentChart.map(entry => ({
            tooth_code: entry.tooth_code,
            procedure: entryProcedure(entry),
            status: toothVisualStatus(entry).label,
            condition: entry.condition,
            notes: entry.notes,
            scheduled_date: normalizeDate(entry.scheduled_date),
          })),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.message || 'Não foi possível gerar a sugestão do termo.')
      const generated = String(payload?.text || '').trim()
      if (!generated) throw new Error('A IA retornou uma resposta vazia. Tente novamente com mais detalhes.')
      setTerm(current => ({ ...current, termText: generated }))
      setAiFeedback({ type: 'success', message: payload?.disclaimer || 'Sugestão gerada. Revise e edite o texto antes de imprimir.' })
    } catch (error: any) {
      setAiFeedback({ type: 'error', message: error?.message || 'Não foi possível consultar a IA no momento.' })
    } finally {
      setAiLoading(false)
    }
  }

  function handlePrint() {
    const classes = ['print-odontogram']

    document.body.classList.add(...classes)
    const cleanup = () => {
      document.body.classList.remove(...classes)
      window.removeEventListener('afterprint', cleanup)
    }

    window.addEventListener('afterprint', cleanup)
    window.setTimeout(() => {
      window.print()
      window.setTimeout(cleanup, 500)
    }, 80)
  }

  const upperTeeth = activeChart.teeth.filter(tooth => tooth.arch === 'upper')
  const lowerTeeth = activeChart.teeth.filter(tooth => tooth.arch === 'lower')

  return (
    <>
      <div className='odontogram-screen space-y-6'>
        <ChartTabs activeChartId={activeChartId} onChange={changeChart} />

        <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
          <label htmlFor='patient_id' className='font-semibold'>Paciente do odontograma</label>
          <select id='patient_id' value={selectedPatientId} onChange={event => changePatient(event.target.value)} className='mt-2' aria-label='Selecionar paciente do odontograma'>
            <option value=''>Selecione um paciente para habilitar o mapa dental</option>
            {patients.map(patient => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}
          </select>
          {!selectedPatientId ? <p className='mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'>Escolha um paciente antes de registrar procedimentos em dentes.</p> : null}
        </div>

        <PrintActions chart={activeChart} disabled={!selectedPatientId} onPrint={handlePrint} />

        <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]'>
          <div className='odontogram-map-panel space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-5'>
            <div className='rounded-2xl border border-blue-100 bg-white/80 p-3'>
              <p className='text-xs font-extrabold uppercase tracking-wide text-blue-700'>{activeChart.label}</p>
              <h2 className='text-lg font-bold text-slate-900'>{activeChart.title}</h2>
              <p className='text-sm text-slate-600'>{activeChart.description}</p>
            </div>
            <ArcSection title='Arcada superior' chart={activeChart} teeth={upperTeeth} entriesByTooth={entriesByTooth} selectedTooth={selectedTooth} disabled={disabledChart} onSelect={setSelectedTooth} />
            <ArcSection title='Arcada inferior' chart={activeChart} teeth={lowerTeeth} entriesByTooth={entriesByTooth} selectedTooth={selectedTooth} disabled={disabledChart} onSelect={setSelectedTooth} />
            <StatusLegend />
          </div>

          <aside className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
            <h2 className='text-lg font-bold'>Resumo do paciente</h2>
            <p className='mt-1 text-sm text-slate-600'>{selectedPatient ? selectedPatient.full_name : 'Nenhum paciente selecionado.'}</p>
            <p className='mt-1 text-xs font-semibold uppercase tracking-wide text-blue-700'>{activeChart.title}</p>
            <dl className='mt-4 grid grid-cols-2 gap-3 text-sm'>
              <div className='rounded-xl bg-slate-50 p-3'>
                <dt className='text-slate-500'>Dentes com registro</dt>
                <dd className='text-2xl font-bold text-blue-700'>{entriesByTooth.size}</dd>
              </div>
              <div className='rounded-xl bg-slate-50 p-3'>
                <dt className='text-slate-500'>Procedimentos</dt>
                <dd className='text-2xl font-bold text-blue-700'>{entriesForCurrentChart.length}</dd>
              </div>
            </dl>
            <div className='mt-4 space-y-2'>
              {entriesForCurrentChart.length ? entriesForCurrentChart.slice(0, 6).map(entry => {
                const visualStatus = toothVisualStatus(entry)
                const style = statusStyle(visualStatus.key)
                return (
                  <button key={entry.id} type='button' onClick={() => setSelectedTooth(entry.tooth_code)} className={`w-full rounded-xl border p-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${style.border} ${style.bg}`} aria-label={`Abrir procedimento do dente ${entry.tooth_code}`}>
                    <span className='font-semibold'>Dente {entry.tooth_code}</span>
                    <span className='block text-slate-600'>{entryProcedure(entry)}</span>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${style.bg} ${style.text}`}><span className={`h-2 w-2 rounded-full ${style.dot}`} />{visualStatus.label}</span>
                  </button>
                )
              }) : <p className='rounded-xl bg-slate-50 p-3 text-sm text-slate-600'>Nenhum procedimento registrado para esta aba.</p>}
            </div>
          </aside>
        </div>

        <ResponsibilityTermSection
          chart={activeChart}
          term={term}
          onChange={changeTermField}
          suggestedProcedures={suggestedProcedures}
          aiLoading={aiLoading}
          aiFeedback={aiFeedback}
          onGenerateSuggestion={handleGenerateTermSuggestion}
        />

        {selectedTooth && selectedPatientId ? (
          <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4' role='dialog' aria-modal='true' aria-labelledby='odontogram-modal-title'>
            <div className='max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3'>
                  {selectedToothConfig ? (
                    <span className='flex h-20 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-2'>
                      <img src={selectedToothConfig.image} alt={`Imagem realista do dente ${selectedTooth}`} className='h-full w-full object-contain' draggable={false} />
                    </span>
                  ) : null}
                  <div>
                    <p className='text-sm font-semibold uppercase tracking-wide text-blue-700'>Dente selecionado</p>
                    <h2 id='odontogram-modal-title' className='text-2xl font-bold'>Dente {selectedTooth}</h2>
                    <p className='text-sm text-slate-600'>{selectedPatient?.full_name}</p>
                  </div>
                </div>
                <button type='button' onClick={() => setSelectedTooth(null)} className='rounded-full border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50' aria-label='Fechar edição do dente'>Fechar</button>
              </div>

              <form action={saveAction} className='mt-5 grid gap-3 sm:grid-cols-2'>
                <input type='hidden' name='patient_id' value={selectedPatientId} />
                <input type='hidden' name='tooth_code' value={selectedTooth} />
                <input type='hidden' name='entry_id' value={currentEntry?.id ?? ''} />
                <input type='hidden' name='chart_type' value={activeChart.id} />

                <label className='space-y-1'>
                  <span>Procedimento cadastrado</span>
                  <select name='procedure_id' defaultValue={currentEntry?.procedure_id ?? ''} aria-label='Procedimento cadastrado'>
                    <option value=''>Procedimento avulso/manual</option>
                    {procedures.map(procedure => <option key={procedure.id} value={procedure.id}>{procedure.name}</option>)}
                  </select>
                </label>

                <label className='space-y-1'>
                  <span>Status</span>
                  <select name='status' defaultValue={currentEntry?.status ?? 'planned'} aria-label='Status do procedimento'>
                    {ODONTOGRAM_STATUS.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                </label>

                <label className='space-y-1 sm:col-span-2'>
                  <span>Procedimento a realizar <strong className='text-red-600'>*</strong></span>
                  <input type='text' name='planned_procedure' required maxLength={180} defaultValue={currentEntry?.planned_procedure ?? currentEntry?.procedure_name ?? ''} placeholder='Ex.: restauração em resina, limpeza, extração...' aria-label='Procedimento a realizar' />
                </label>

                <label className='space-y-1'>
                  <span>Condição do dente</span>
                  <input type='text' name='condition' maxLength={120} defaultValue={currentEntry?.condition ?? ''} placeholder='Ex.: cárie, fratura, sensibilidade' aria-label='Condição do dente' />
                </label>

                <label className='space-y-1'>
                  <span>Data prevista</span>
                  <input name='scheduled_date' type='date' defaultValue={normalizeDate(currentEntry?.scheduled_date ?? null)} className='block w-full rounded-md border border-slate-200 p-2' aria-label='Data prevista do procedimento' />
                </label>

                <label className='space-y-1 sm:col-span-2'>
                  <span>Observações clínicas</span>
                  <textarea name='notes' maxLength={1200} rows={4} defaultValue={currentEntry?.notes ?? ''} placeholder='Registre observações relevantes para este dente.' aria-label='Observações clínicas do dente' />
                </label>

                <div className='flex flex-col gap-2 border-t border-slate-100 pt-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between'>
                  <p className='text-xs text-slate-500'>Ao salvar, o procedimento fica vinculado ao paciente, ao dente selecionado e à aba atual.</p>
                  <SubmitButton label={currentEntry ? 'Atualizar procedimento' : 'Salvar procedimento'} />
                </div>
              </form>

              {currentEntry ? (
                <form action={deleteAction} className='mt-3 flex justify-end'>
                  <input type='hidden' name='patient_id' value={selectedPatientId} />
                  <input type='hidden' name='entry_id' value={currentEntry.id} />
                  <input type='hidden' name='chart_type' value={activeChart.id} />
                  <button type='submit' className='rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50'>Remover procedimento deste dente</button>
                </form>
              ) : null}

              {selectedEntries.length > 1 ? (
                <div className='mt-5 rounded-2xl bg-slate-50 p-3'>
                  <h3 className='font-semibold'>Histórico deste dente</h3>
                  <ul className='mt-2 space-y-2 text-sm'>
                    {selectedEntries.slice(1).map(entry => {
                      const visualStatus = toothVisualStatus(entry)
                      const style = statusStyle(visualStatus.key)
                      return (
                        <li key={entry.id} className={`rounded-xl border bg-white p-3 ${style.border}`}>
                          <span className='font-semibold'>{entryProcedure(entry)}</span>
                          <span className={`mt-1 block text-xs font-bold ${style.text}`}>{visualStatus.label} · {normalizeDate(entry.scheduled_date) || 'Sem data prevista'}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <PrintMapArea chart={activeChart} patientName={selectedPatient?.full_name ?? ''} entries={entriesForCurrentChart} entriesByTooth={entriesByTooth} term={term} suggestedProcedures={suggestedProcedures} />
    </>
  )
}
