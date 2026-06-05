'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { SubmitButton } from '../_components/submit-button'
import {
  ODONTOGRAM_CHARTS,
  ODONTOGRAM_STATUS,
  ODONTOGRAM_STATUS_LEGEND,
  ODONTOGRAM_STATUS_STYLES,
  type OdontogramChart,
  type OdontogramChartId,
  type OdontogramEntry,
  type OdontogramTerm,
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
  terms: OdontogramTerm[]
  selectedPatientId: string
  initialTab: OdontogramChartId
  initialTermId: string
  saveAction: Action
  deleteAction: Action
  saveTermAction: Action
  deleteTermAction: Action
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

function formatDateTime(value: string | null) {
  if (!value) return 'Sem data'
  try {
    return new Date(value).toLocaleString('pt-BR')
  } catch {
    return formatDate(value)
  }
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

function termStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'Rascunho',
    signed: 'Assinado',
    canceled: 'Cancelado',
  }
  return labels[status] ?? status
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

function sanitizePrintText(value: string | null | undefined) {
  return String(value || '').trim() || '________________________________________'
}

function emptyResponsibilityTerm(): ResponsibilityTerm {
  return {
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
  }
}

function termFromHistory(savedTerm: OdontogramTerm): ResponsibilityTerm {
  return {
    childName: savedTerm.child_name ?? '',
    birthOrAge: savedTerm.birth_or_age ?? '',
    guardianName: savedTerm.guardian_name ?? '',
    guardianDocument: savedTerm.guardian_document ?? '',
    guardianPhone: savedTerm.guardian_phone ?? '',
    relationship: savedTerm.relationship ?? '',
    authorizedProcedures: savedTerm.authorized_procedures ?? '',
    authorizationDate: normalizeDate(savedTerm.authorization_date),
    professionalName: savedTerm.professional_name ?? '',
    termText: savedTerm.term_text ?? '',
  }
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

function PrintActions({ chart, disabled, onPrintOdontogram, onPrintTerm }: { chart: OdontogramChart; disabled: boolean; onPrintOdontogram: () => void; onPrintTerm: () => void }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h2 className='text-base font-bold'>Impressão</h2>
          <p className='text-sm text-slate-600'>Gere relatórios separados para o odontograma {chart.id === 'children' ? 'infantil' : 'adulto'} e para o termo de autorização/responsabilidade.</p>
        </div>
        <div className='grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end'>
          <button type='button' onClick={onPrintOdontogram} disabled={disabled} className='rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300' aria-label={`Imprimir ${chart.title}`}>
            Imprimir Odontograma
          </button>
          <button type='button' onClick={onPrintTerm} disabled={disabled} className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400' aria-label={`Imprimir termo do ${chart.title}`}>
            Imprimir Termo
          </button>
        </div>
      </div>
    </div>
  )
}

function SignaturePad({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef({ x: 0, y: 0 })

  function paintBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  function prepareCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(rect.width, 320)
    const height = Math.max(rect.height, 180)
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.floor(width * ratio)
    canvas.height = Math.floor(height * ratio)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    paintBackground(ctx, width, height)
    if (value) {
      const image = new Image()
      image.onload = () => ctx.drawImage(image, 0, 0, width, height)
      image.src = value
    }
  }

  useEffect(() => {
    prepareCanvas()
    const onResize = () => prepareCanvas()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [value])

  function canvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    lastPointRef.current = canvasPoint(event)
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return
    event.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const point = canvasPoint(event)
    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPointRef.current = point
  }

  function finishDrawing(event?: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    drawingRef.current = false
    if (event) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // Ignora navegadores que já liberaram o ponteiro.
      }
    }
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }

  function clearSignature() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const rect = canvas.getBoundingClientRect()
    paintBackground(ctx, Math.max(rect.width, 320), Math.max(rect.height, 180))
    onChange('')
  }

  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-3'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <p className='text-sm font-extrabold text-slate-900'>Assinatura digital</p>
          <p className='text-xs text-slate-500'>Assine com o dedo no celular ou com mouse/caneta no computador.</p>
        </div>
        <button type='button' onClick={clearSignature} disabled={disabled || !value} className='rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'>Limpar assinatura</button>
      </div>
      <canvas
        ref={canvasRef}
        className='odontogram-signature-canvas mt-3 h-44 w-full rounded-xl border border-dashed border-slate-300 bg-white'
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={finishDrawing}
        onPointerCancel={finishDrawing}
        aria-label='Campo para assinatura digital'
      />
      <p className='mt-2 text-[11px] text-slate-500'>A assinatura é salva junto com o termo no banco de dados da clínica. Não armazene chaves ou senhas nesse campo.</p>
    </div>
  )
}


function TermSaveButtons({ disabled, selectedTermId }: { disabled: boolean; selectedTermId: string }) {
  const { pending } = useFormStatus()
  const isDisabled = disabled || pending

  return (
    <>
      <button type='submit' name='save_mode' value={selectedTermId ? 'update' : 'new'} disabled={isDisabled} className='rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300'>
        {pending ? 'Salvando...' : selectedTermId ? 'Atualizar termo' : 'Salvar termo'}
      </button>
      <button type='submit' name='save_mode' value='new_version' disabled={isDisabled || !selectedTermId} className='rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50'>
        {pending ? 'Salvando...' : 'Salvar nova versão'}
      </button>
    </>
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
  selectedPatientId,
  selectedTermId,
  terms,
  signatureDataUrl,
  onSignatureChange,
  onLoadTerm,
  onClearLoadedTerm,
  onPrintTerm,
  onPrintSavedTerm,
  saveTermAction,
  deleteTermAction,
}: {
  chart: OdontogramChart
  term: ResponsibilityTerm
  onChange: (field: keyof ResponsibilityTerm, value: string) => void
  suggestedProcedures: string
  aiLoading: boolean
  aiFeedback: { type: 'success' | 'error' | 'info'; message: string } | null
  onGenerateSuggestion: () => void
  selectedPatientId: string
  selectedTermId: string
  terms: OdontogramTerm[]
  signatureDataUrl: string
  onSignatureChange: (value: string) => void
  onLoadTerm: (term: OdontogramTerm) => void
  onClearLoadedTerm: () => void
  onPrintTerm: () => void
  onPrintSavedTerm: (term: OdontogramTerm) => void
  saveTermAction: Action
  deleteTermAction: Action
}) {
  const isChild = chart.id === 'children'
  const selectedTerm = terms.find(savedTerm => savedTerm.id === selectedTermId)

  return (
    <section className='rounded-3xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm sm:p-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-xs font-extrabold uppercase tracking-wide text-emerald-700'>Termo, assinatura e histórico</p>
          <h2 className='text-xl font-bold text-slate-900'>{isChild ? 'Responsabilidade e autorização do responsável' : 'Termo de ciência/autorização do paciente'}</h2>
          <p className='mt-1 max-w-3xl text-sm text-slate-600'>Preencha, assine, salve no banco e imprima o termo separado do relatório do odontograma. A IA é apenas apoio textual.</p>
        </div>
        <button
          type='button'
          onClick={onGenerateSuggestion}
          disabled={aiLoading || !selectedPatientId}
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
          <textarea rows={7} value={term.termText} onChange={event => onChange('termText', event.target.value)} placeholder='Clique em “Sugerir termo com IA” ou escreva o texto manualmente. O conteúdo ficará editável antes da impressão e salvamento.' aria-label='Texto do termo de responsabilidade ou autorização' />
        </label>
      </div>

      <div className='mt-4'>
        <SignaturePad value={signatureDataUrl} onChange={onSignatureChange} disabled={!selectedPatientId} />
      </div>

      <div className='mt-4 rounded-2xl border border-emerald-100 bg-white p-4'>
        <div className='flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between'>
          <div>
            <p className='text-sm font-extrabold text-slate-900'>Salvar e imprimir termo</p>
            <p className='text-xs text-slate-500'>Termo carregado: {selectedTerm ? `versão ${selectedTerm.version} · ${formatDateTime(selectedTerm.updated_at)}` : 'novo termo'}</p>
          </div>
          <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end'>
            <button type='button' onClick={onPrintTerm} disabled={!selectedPatientId} className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50'>Imprimir Termo</button>
            <button type='button' onClick={onClearLoadedTerm} disabled={!selectedPatientId} className='rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'>Novo termo em branco</button>
          </div>
        </div>

        <form action={saveTermAction} className='mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end'>
          <input type='hidden' name='patient_id' value={selectedPatientId} />
          <input type='hidden' name='chart_type' value={chart.id} />
          <input type='hidden' name='term_id' value={selectedTermId} />
          <input type='hidden' name='child_name' value={term.childName} />
          <input type='hidden' name='birth_or_age' value={term.birthOrAge} />
          <input type='hidden' name='guardian_name' value={term.guardianName} />
          <input type='hidden' name='guardian_document' value={term.guardianDocument} />
          <input type='hidden' name='guardian_phone' value={term.guardianPhone} />
          <input type='hidden' name='relationship' value={term.relationship} />
          <input type='hidden' name='authorization_date' value={term.authorizationDate} />
          <input type='hidden' name='professional_name' value={term.professionalName} />
          <input type='hidden' name='authorized_procedures' value={term.authorizedProcedures} />
          <input type='hidden' name='term_text' value={term.termText} />
          <input type='hidden' name='signature_data_url' value={signatureDataUrl} />
          <TermSaveButtons disabled={!selectedPatientId} selectedTermId={selectedTermId} />
        </form>
      </div>

      <div className='mt-4 rounded-2xl border border-slate-200 bg-white p-4'>
        <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <p className='text-sm font-extrabold text-slate-900'>Histórico de termos salvos</p>
            <p className='text-xs text-slate-500'>Carregue um termo para reemitir, imprimir, atualizar, salvar nova versão ou excluir.</p>
          </div>
          <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600'>{terms.length} registro(s)</span>
        </div>
        {terms.length ? (
          <div className='mt-3 grid gap-3'>
            {terms.map(savedTerm => (
              <article key={savedTerm.id} className={`rounded-2xl border p-3 ${savedTerm.id === selectedTermId ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-slate-50/80'}`}>
                <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center'>
                  <div>
                    <p className='text-sm font-extrabold text-slate-900'>{savedTerm.chart_type === 'children' ? 'Termo infantil' : 'Termo adulto'} · versão {savedTerm.version}</p>
                    <p className='text-xs text-slate-600'>Criado em {formatDateTime(savedTerm.created_at)} · Atualizado em {formatDateTime(savedTerm.updated_at)}</p>
                    <p className='mt-1 text-xs text-slate-600'>Status: <strong>{termStatusLabel(savedTerm.status)}</strong>{savedTerm.guardian_name ? ` · Responsável: ${savedTerm.guardian_name}` : ''}{savedTerm.created_by_name ? ` · Salvo por: ${savedTerm.created_by_name}` : ''}</p>
                    {savedTerm.related_teeth?.length ? <p className='mt-1 text-xs text-slate-500'>Dentes vinculados: {savedTerm.related_teeth.join(', ')}</p> : null}
                  </div>
                  <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end'>
                    <button type='button' onClick={() => onLoadTerm(savedTerm)} className='rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50'>Carregar/reemitir</button>
                    <button type='button' onClick={() => onPrintSavedTerm(savedTerm)} className='rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100'>Imprimir salvo</button>
                    <form action={deleteTermAction} onSubmit={event => { if (!window.confirm('Deseja excluir este termo salvo? Essa ação não pode ser desfeita.')) event.preventDefault() }}>
                      <input type='hidden' name='patient_id' value={savedTerm.patient_id} />
                      <input type='hidden' name='chart_type' value={savedTerm.chart_type} />
                      <input type='hidden' name='term_id' value={savedTerm.id} />
                      <button type='submit' className='w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50'>Excluir</button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className='mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600'>Nenhum termo salvo para este paciente e tipo de odontograma.</p>
        )}
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

function PrintablePatientDetails({ patient }: { patient?: PatientOption }) {
  return (
    <div className='mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-300 p-2 text-xs'>
      <p><strong>Paciente:</strong> {sanitizePrintText(patient?.full_name)}</p>
      <p><strong>CPF:</strong> {patient?.cpf || 'Não informado'}</p>
      <p><strong>Nascimento:</strong> {patient?.birth_date ? formatDate(patient.birth_date) : 'Não informado'}</p>
      <p><strong>Telefone:</strong> {patient?.phone || 'Não informado'}</p>
      <p><strong>E-mail:</strong> {patient?.email || 'Não informado'}</p>
      <p><strong>Responsável no cadastro:</strong> {patient?.guardian_name || 'Não informado'}</p>
    </div>
  )
}

function PrintableSelectedTeethSummary({ entries }: { entries: OdontogramEntry[] }) {
  const selectedTeeth = [...new Set(entries.map(entry => entry.tooth_code))]
  return (
    <div className='mt-3 rounded-xl border border-slate-300 p-2 text-xs'>
      <p><strong>Dentes selecionados/preenchidos:</strong> {selectedTeeth.length ? selectedTeeth.join(', ') : 'Nenhum dente preenchido'}</p>
      <p><strong>Total de procedimentos no histórico:</strong> {entries.length}</p>
    </div>
  )
}

function PrintableProcedureList({ entries }: { entries: OdontogramEntry[] }) {
  return (
    <div className='odontogram-print-filled-only mt-4'>
      <h3 className='text-sm font-extrabold'>Histórico completo dos procedimentos</h3>
      {entries.length ? (
        <table className='mt-2 w-full border-collapse text-xs'>
          <thead>
            <tr>
              <th className='border border-slate-300 p-1 text-left'>Dente</th>
              <th className='border border-slate-300 p-1 text-left'>Procedimento</th>
              <th className='border border-slate-300 p-1 text-left'>Condição</th>
              <th className='border border-slate-300 p-1 text-left'>Status</th>
              <th className='border border-slate-300 p-1 text-left'>Data prevista</th>
              <th className='border border-slate-300 p-1 text-left'>Observações</th>
              <th className='border border-slate-300 p-1 text-left'>Responsável</th>
              <th className='border border-slate-300 p-1 text-left'>Atualizado em</th>
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
                <td className='border border-slate-300 p-1'>{entry.created_by_name || '-'}</td>
                <td className='border border-slate-300 p-1'>{formatDateTime(entry.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className='mt-2 rounded-lg border border-slate-300 p-2 text-xs'>Nenhum procedimento registrado.</p>}
    </div>
  )
}

function PrintableTermDetails({ chart, term, patientName, suggestedProcedures, entries, signatureDataUrl }: { chart: OdontogramChart; term: ResponsibilityTerm; patientName: string; suggestedProcedures: string; entries: OdontogramEntry[]; signatureDataUrl: string }) {
  const isChild = chart.id === 'children'
  const fallbackText = isChild
    ? 'Declaro, na condição de responsável legal pela criança identificada neste documento, que recebi as orientações necessárias, pude esclarecer dúvidas e autorizo a realização dos procedimentos odontológicos descritos, conforme avaliação profissional e odontograma preenchido.'
    : 'Declaro que recebi as orientações necessárias, pude esclarecer dúvidas e estou ciente/autorizo os procedimentos odontológicos registrados neste odontograma, conforme avaliação profissional.'
  const termText = term.termText.trim() || fallbackText
  const relatedTeeth = [...new Set(entries.map(entry => entry.tooth_code))]

  return (
    <div className='odontogram-print-filled-only mt-4 space-y-3'>
      <h3 className='text-sm font-extrabold'>{isChild ? 'Dados da criança, responsável e autorização' : 'Dados do termo de ciência/autorização'}</h3>
      <div className='grid grid-cols-2 gap-2 text-xs'>
        <p><strong>Paciente:</strong> {sanitizePrintText(patientName)}</p>
        <p><strong>Tipo:</strong> {chart.title}</p>
        {isChild ? <p><strong>Criança:</strong> {sanitizePrintText(term.childName || patientName)}</p> : null}
        {isChild ? <p><strong>Nascimento/idade:</strong> {sanitizePrintText(term.birthOrAge)}</p> : null}
        {isChild ? <p><strong>Responsável:</strong> {sanitizePrintText(term.guardianName)}</p> : null}
        {isChild ? <p><strong>CPF/RG:</strong> {sanitizePrintText(term.guardianDocument)}</p> : null}
        {isChild ? <p><strong>Telefone:</strong> {sanitizePrintText(term.guardianPhone)}</p> : null}
        {isChild ? <p><strong>Parentesco:</strong> {sanitizePrintText(term.relationship)}</p> : null}
        <p><strong>Data:</strong> {term.authorizationDate ? formatDate(term.authorizationDate) : new Date().toLocaleDateString('pt-BR')}</p>
        <p><strong>Profissional:</strong> {sanitizePrintText(term.professionalName)}</p>
        <p><strong>Dentes relacionados:</strong> {relatedTeeth.length ? relatedTeeth.join(', ') : 'Não informado'}</p>
      </div>
      <div className='rounded-xl border border-slate-300 p-2 text-xs leading-relaxed'>
        <p><strong>Procedimentos autorizados:</strong> {term.authorizedProcedures.trim() || suggestedProcedures || 'Não informado'}</p>
        <p className='mt-2 whitespace-pre-line'>{termText}</p>
        <p className='mt-2 text-[10px] text-slate-600'>Texto de apoio sujeito à revisão clínica/profissional e, quando necessário, jurídica.</p>
      </div>
      <div className='rounded-xl border border-slate-300 p-2 text-xs'>
        <p className='font-bold'>Resumo dos procedimentos vinculados ao termo</p>
        {entries.length ? (
          <ul className='mt-1 grid grid-cols-2 gap-x-4 gap-y-1'>
            {entries.map(entry => <li key={entry.id}>Dente {entry.tooth_code}: {entryProcedure(entry)} · {toothVisualStatus(entry).label}</li>)}
          </ul>
        ) : <p className='mt-1'>Nenhum procedimento vinculado.</p>}
      </div>
      <div className='mt-6 grid grid-cols-2 gap-10 text-center text-xs'>
        <div className='min-h-24 border-t border-slate-700 pt-2'>
          {signatureDataUrl ? <img src={signatureDataUrl} alt='Assinatura digital capturada' className='mx-auto -mt-20 mb-2 h-20 max-w-full object-contain' /> : null}
          {isChild ? 'Assinatura do responsável' : 'Assinatura do paciente/responsável'}
        </div>
        <div className='border-t border-slate-700 pt-2'>Assinatura do profissional</div>
      </div>
    </div>
  )
}

function PrintMapArea({ chart, patient, entries, entriesByTooth }: { chart: OdontogramChart; patient?: PatientOption; entries: OdontogramEntry[]; entriesByTooth: Map<string, OdontogramEntry[]> }) {
  return (
    <section className='odontogram-print-area odontogram-print-map-only hidden'>
      <header className='mb-4 border-b border-slate-300 pb-3'>
        <p className='text-xs font-bold uppercase tracking-wide text-slate-500'>SmileHub · Relatório do Odontograma</p>
        <h1 className='text-xl font-extrabold'>{chart.title}</h1>
        <p className='text-sm'>Paciente: <strong>{patient?.full_name || 'Não informado'}</strong></p>
        <p className='text-xs text-slate-600'>Data da impressão: {new Date().toLocaleDateString('pt-BR')}</p>
      </header>
      <PrintablePatientDetails patient={patient} />
      <PrintableSelectedTeethSummary entries={entries} />
      <div className='mt-4'>
        <PrintableChart chart={chart} entriesByTooth={entriesByTooth} />
      </div>
      <PrintableProcedureList entries={entries} />
    </section>
  )
}

function PrintTermArea({ chart, patient, entries, term, suggestedProcedures, signatureDataUrl }: { chart: OdontogramChart; patient?: PatientOption; entries: OdontogramEntry[]; term: ResponsibilityTerm; suggestedProcedures: string; signatureDataUrl: string }) {
  return (
    <section className='odontogram-print-area odontogram-print-term-only hidden'>
      <header className='mb-4 border-b border-slate-300 pb-3'>
        <p className='text-xs font-bold uppercase tracking-wide text-slate-500'>SmileHub · Termo de Responsabilidade/Autorização</p>
        <h1 className='text-xl font-extrabold'>{chart.id === 'children' ? 'Termo infantil de autorização do responsável' : 'Termo adulto de ciência/autorização'}</h1>
        <p className='text-sm'>Paciente: <strong>{patient?.full_name || 'Não informado'}</strong></p>
        <p className='text-xs text-slate-600'>Data da impressão: {new Date().toLocaleDateString('pt-BR')}</p>
      </header>
      <PrintablePatientDetails patient={patient} />
      <PrintableTermDetails chart={chart} term={term} patientName={patient?.full_name ?? ''} suggestedProcedures={suggestedProcedures} entries={entries} signatureDataUrl={signatureDataUrl} />
    </section>
  )
}

export function OdontogramClient({ patients, procedures, entries, terms, selectedPatientId, initialTab, initialTermId, saveAction, deleteAction, saveTermAction, deleteTermAction }: OdontogramClientProps) {
  const router = useRouter()
  const initialChart = chartsById.get(initialTab) ?? ODONTOGRAM_CHARTS[0]
  const [activeChartId, setActiveChartId] = useState<OdontogramChartId>(initialChart.id)
  const [selectedTooth, setSelectedTooth] = useState<ToothCode | null>(null)
  const [selectedTermId, setSelectedTermId] = useState(initialTermId)
  const [signatureDataUrl, setSignatureDataUrl] = useState('')
  const [term, setTerm] = useState<ResponsibilityTerm>(emptyResponsibilityTerm)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const activeChart = chartsById.get(activeChartId) ?? ODONTOGRAM_CHARTS[0]
  const selectedPatient = patients.find(patient => patient.id === selectedPatientId)
  const selectedToothConfig = selectedTooth ? teethByNumber.get(selectedTooth) : null
  const activeToothSet = useMemo(() => new Set(activeChart.teeth.map(tooth => tooth.number)), [activeChart])

  const entriesForCurrentChart = useMemo(() => entries.filter(entry => (!selectedPatientId || entry.patient_id === selectedPatientId) && activeToothSet.has(entry.tooth_code)), [activeToothSet, entries, selectedPatientId])
  const entriesByTooth = useMemo(() => groupEntriesByTooth(entriesForCurrentChart), [entriesForCurrentChart])
  const termsForCurrentChart = useMemo(() => terms.filter(savedTerm => savedTerm.patient_id === selectedPatientId && savedTerm.chart_type === activeChart.id), [activeChart.id, selectedPatientId, terms])

  const selectedEntries = selectedTooth ? entriesByTooth.get(selectedTooth) ?? [] : []
  const currentEntry = selectedEntries[0]
  const disabledChart = !selectedPatientId
  const suggestedProcedures = entriesForCurrentChart.map(entry => `Dente ${entry.tooth_code}: ${entryProcedure(entry)} (${toothVisualStatus(entry).label})`).join('; ')

  function loadSavedTerm(savedTerm: OdontogramTerm) {
    setSelectedTermId(savedTerm.id)
    setTerm(termFromHistory(savedTerm))
    setSignatureDataUrl(savedTerm.signature_data_url ?? '')
  }

  function clearLoadedTerm() {
    setSelectedTermId('')
    setTerm(emptyResponsibilityTerm())
    setSignatureDataUrl('')
  }

  useEffect(() => {
    if (!initialTermId) return
    const savedTerm = terms.find(item => item.id === initialTermId)
    if (savedTerm) loadSavedTerm(savedTerm)
  }, [initialTermId, terms])

  useEffect(() => {
    if (selectedTermId && !termsForCurrentChart.some(savedTerm => savedTerm.id === selectedTermId)) {
      clearLoadedTerm()
    }
  }, [selectedTermId, termsForCurrentChart])

  function changePatient(patientId: string) {
    setSelectedTooth(null)
    clearLoadedTerm()
    router.push(patientId ? `/admin/odontogram?patient_id=${patientId}&tab=${activeChartId}` : `/admin/odontogram?tab=${activeChartId}`)
  }

  function changeChart(chartId: OdontogramChartId) {
    setActiveChartId(chartId)
    setSelectedTooth(null)
    clearLoadedTerm()
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

  function handlePrint(mode: 'odontogram' | 'term') {
    const classes = [mode === 'term' ? 'print-odontogram-term' : 'print-odontogram']

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

  function handlePrintSavedTerm(savedTerm: OdontogramTerm) {
    loadSavedTerm(savedTerm)
    window.setTimeout(() => handlePrint('term'), 120)
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
          {!selectedPatientId ? <p className='mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'>Escolha um paciente antes de registrar procedimentos em dentes, salvar termos ou imprimir relatórios.</p> : null}
        </div>

        <PrintActions chart={activeChart} disabled={!selectedPatientId} onPrintOdontogram={() => handlePrint('odontogram')} onPrintTerm={() => handlePrint('term')} />

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
              <div className='rounded-xl bg-slate-50 p-3'>
                <dt className='text-slate-500'>Termos salvos</dt>
                <dd className='text-2xl font-bold text-emerald-700'>{termsForCurrentChart.length}</dd>
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
          selectedPatientId={selectedPatientId}
          selectedTermId={selectedTermId}
          terms={termsForCurrentChart}
          signatureDataUrl={signatureDataUrl}
          onSignatureChange={setSignatureDataUrl}
          onLoadTerm={loadSavedTerm}
          onClearLoadedTerm={clearLoadedTerm}
          onPrintTerm={() => handlePrint('term')}
          onPrintSavedTerm={handlePrintSavedTerm}
          saveTermAction={saveTermAction}
          deleteTermAction={deleteTermAction}
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

      <PrintMapArea chart={activeChart} patient={selectedPatient} entries={entriesForCurrentChart} entriesByTooth={entriesByTooth} />
      <PrintTermArea chart={activeChart} patient={selectedPatient} entries={entriesForCurrentChart} term={term} suggestedProcedures={suggestedProcedures} signatureDataUrl={signatureDataUrl} />
    </>
  )
}
