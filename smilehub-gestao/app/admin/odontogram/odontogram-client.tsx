'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SubmitButton } from '../_components/submit-button'
import {
  ODONTOGRAM_STATUS,
  ODONTOGRAM_STATUS_LEGEND,
  ODONTOGRAM_STATUS_STYLES,
  ODONTOGRAM_TEETH,
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
  saveAction: Action
  deleteAction: Action
}

const emptyStatusStyle = {
  dot: 'bg-slate-300',
  bg: 'bg-white',
  border: 'border-slate-200',
  text: 'text-slate-600',
  ring: 'ring-slate-200',
}

const upperTeeth = ODONTOGRAM_TEETH.filter(tooth => tooth.arch === 'upper')
const lowerTeeth = ODONTOGRAM_TEETH.filter(tooth => tooth.arch === 'lower')
const teethByNumber = new Map<ToothCode, ToothConfig>(ODONTOGRAM_TEETH.map(tooth => [tooth.number, tooth] as const))

function normalizeDate(value: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
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

function toothVisualStatus(activeEntry?: OdontogramEntry) {
  if (!activeEntry) return { key: 'healthy', label: 'Saudável' }
  if (isExtractedEntry(activeEntry)) return { key: 'extracted', label: 'Extraído' }
  if (activeEntry.status === 'canceled') return { key: 'observation', label: 'Observação' }

  return { key: activeEntry.status, label: statusLabel(activeEntry.status) }
}

function statusStyle(status?: string | null) {
  return status ? ODONTOGRAM_STATUS_STYLES[status] ?? emptyStatusStyle : emptyStatusStyle
}

function ToothButton({
  tooth,
  activeEntry,
  selected,
  disabled,
  onSelect,
}: {
  tooth: ToothConfig
  activeEntry?: OdontogramEntry
  selected: boolean
  disabled: boolean
  onSelect: (code: ToothCode) => void
}) {
  const hasEntry = Boolean(activeEntry)
  const visualStatus = toothVisualStatus(activeEntry)
  const style = statusStyle(visualStatus.key)

  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() => onSelect(tooth.number)}
      className={`group relative flex min-h-[10.75rem] min-w-[4.75rem] flex-col items-center justify-between overflow-visible rounded-2xl border px-2 py-2 transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[11.5rem] ${hasEntry ? `${style.bg} ${style.border}` : 'border-slate-200 bg-gradient-to-b from-white to-slate-50'} ${selected ? `ring-4 ${style.ring} border-blue-500 shadow-lg` : 'shadow-sm'}`}
      aria-label={`Selecionar dente ${tooth.number}. Status: ${visualStatus.label}`}
      aria-pressed={selected}
      data-tooth-status={visualStatus.key}
    >
      <span className={`absolute right-2 top-2 h-3 w-3 rounded-full ${style.dot}`} aria-hidden='true' />
      {tooth.arch === 'upper' ? <span className='text-xs font-bold text-slate-800'>{tooth.number}</span> : <span className='h-4' aria-hidden='true' />}
      <span className='flex min-h-[6.6rem] w-full items-center justify-center sm:min-h-[7.5rem]'>
        <img
          src={tooth.image}
          alt={`Imagem realista do dente ${tooth.number}`}
          className='odontogram-tooth-image h-24 max-h-32 w-full max-w-[5.5rem] object-contain transition duration-200 group-hover:scale-105 sm:h-28'
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
  teeth,
  entriesByTooth,
  selectedTooth,
  disabled,
  onSelect,
}: {
  title: string
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
      <div className='overflow-x-auto pb-2'>
        <div className='grid min-w-[58rem] grid-cols-[repeat(16,minmax(3.5rem,1fr))] gap-2 xl:min-w-0'>
          {teeth.map(tooth => (
            <ToothButton
              key={tooth.number}
              tooth={tooth}
              activeEntry={entriesByTooth.get(tooth.number)?.[0]}
              selected={selectedTooth === tooth.number}
              disabled={disabled}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export function OdontogramClient({ patients, procedures, entries, selectedPatientId, saveAction, deleteAction }: OdontogramClientProps) {
  const router = useRouter()
  const [selectedTooth, setSelectedTooth] = useState<ToothCode | null>(null)
  const selectedPatient = patients.find(patient => patient.id === selectedPatientId)
  const selectedToothConfig = selectedTooth ? teethByNumber.get(selectedTooth) : null

  const entriesByTooth = useMemo(() => {
    const grouped = new Map<string, OdontogramEntry[]>()
    entries
      .filter(entry => !selectedPatientId || entry.patient_id === selectedPatientId)
      .forEach(entry => grouped.set(entry.tooth_code, [...(grouped.get(entry.tooth_code) ?? []), entry]))
    return grouped
  }, [entries, selectedPatientId])

  const selectedEntries = selectedTooth ? entriesByTooth.get(selectedTooth) ?? [] : []
  const currentEntry = selectedEntries[0]
  const disabledChart = !selectedPatientId

  function changePatient(patientId: string) {
    setSelectedTooth(null)
    router.push(patientId ? `/admin/odontogram?patient_id=${patientId}` : '/admin/odontogram')
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
        <label htmlFor='patient_id' className='font-semibold'>Paciente do odontograma</label>
        <select id='patient_id' value={selectedPatientId} onChange={event => changePatient(event.target.value)} className='mt-2'>
          <option value=''>Selecione um paciente para habilitar o mapa dental</option>
          {patients.map(patient => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}
        </select>
        {!selectedPatientId ? <p className='mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'>Escolha um paciente antes de registrar procedimentos em dentes.</p> : null}
      </div>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]'>
        <div className='odontogram-map-panel space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-5'>
          <ArcSection title='Arcada superior' teeth={upperTeeth} entriesByTooth={entriesByTooth} selectedTooth={selectedTooth} disabled={disabledChart} onSelect={setSelectedTooth} />
          <ArcSection title='Arcada inferior' teeth={lowerTeeth} entriesByTooth={entriesByTooth} selectedTooth={selectedTooth} disabled={disabledChart} onSelect={setSelectedTooth} />
          <StatusLegend />
        </div>

        <aside className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
          <h2 className='text-lg font-bold'>Resumo do paciente</h2>
          <p className='mt-1 text-sm text-slate-600'>{selectedPatient ? selectedPatient.full_name : 'Nenhum paciente selecionado.'}</p>
          <dl className='mt-4 grid grid-cols-2 gap-3 text-sm'>
            <div className='rounded-xl bg-slate-50 p-3'>
              <dt className='text-slate-500'>Dentes com registro</dt>
              <dd className='text-2xl font-bold text-blue-700'>{entriesByTooth.size}</dd>
            </div>
            <div className='rounded-xl bg-slate-50 p-3'>
              <dt className='text-slate-500'>Procedimentos</dt>
              <dd className='text-2xl font-bold text-blue-700'>{entries.length}</dd>
            </div>
          </dl>
          <div className='mt-4 space-y-2'>
            {entries.length ? entries.slice(0, 6).map(entry => {
              const visualStatus = toothVisualStatus(entry)
              const style = statusStyle(visualStatus.key)
              return (
                <button key={entry.id} type='button' onClick={() => setSelectedTooth(entry.tooth_code)} className={`w-full rounded-xl border p-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${style.border} ${style.bg}`}>
                  <span className='font-semibold'>Dente {entry.tooth_code}</span>
                  <span className='block text-slate-600'>{entry.procedure_name || entry.planned_procedure || 'Procedimento sem descrição'}</span>
                  <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${style.bg} ${style.text}`}><span className={`h-2 w-2 rounded-full ${style.dot}`} />{visualStatus.label}</span>
                </button>
              )
            }) : <p className='rounded-xl bg-slate-50 p-3 text-sm text-slate-600'>Nenhum procedimento registrado para o filtro atual.</p>}
          </div>
        </aside>
      </div>

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
              <button type='button' onClick={() => setSelectedTooth(null)} className='rounded-full border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50'>Fechar</button>
            </div>

            <form action={saveAction} className='mt-5 grid gap-3 sm:grid-cols-2'>
              <input type='hidden' name='patient_id' value={selectedPatientId} />
              <input type='hidden' name='tooth_code' value={selectedTooth} />
              <input type='hidden' name='entry_id' value={currentEntry?.id ?? ''} />

              <label className='space-y-1'>
                <span>Procedimento cadastrado</span>
                <select name='procedure_id' defaultValue={currentEntry?.procedure_id ?? ''}>
                  <option value=''>Procedimento avulso/manual</option>
                  {procedures.map(procedure => <option key={procedure.id} value={procedure.id}>{procedure.name}</option>)}
                </select>
              </label>

              <label className='space-y-1'>
                <span>Status</span>
                <select name='status' defaultValue={currentEntry?.status ?? 'planned'}>
                  {ODONTOGRAM_STATUS.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </label>

              <label className='space-y-1 sm:col-span-2'>
                <span>Procedimento a realizar <strong className='text-red-600'>*</strong></span>
                <input type='text' name='planned_procedure' required maxLength={180} defaultValue={currentEntry?.planned_procedure ?? currentEntry?.procedure_name ?? ''} placeholder='Ex.: restauração em resina, limpeza, extração...' />
              </label>

              <label className='space-y-1'>
                <span>Condição do dente</span>
                <input type='text' name='condition' maxLength={120} defaultValue={currentEntry?.condition ?? ''} placeholder='Ex.: cárie, fratura, sensibilidade' />
              </label>

              <label className='space-y-1'>
                <span>Data prevista</span>
                <input name='scheduled_date' type='date' defaultValue={normalizeDate(currentEntry?.scheduled_date ?? null)} className='block w-full rounded-md border border-slate-200 p-2' />
              </label>

              <label className='space-y-1 sm:col-span-2'>
                <span>Observações clínicas</span>
                <textarea name='notes' maxLength={1200} rows={4} defaultValue={currentEntry?.notes ?? ''} placeholder='Registre observações relevantes para este dente.' />
              </label>

              <div className='flex flex-col gap-2 border-t border-slate-100 pt-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between'>
                <p className='text-xs text-slate-500'>Ao salvar, o procedimento fica vinculado ao paciente e ao dente selecionado.</p>
                <SubmitButton label={currentEntry ? 'Atualizar procedimento' : 'Salvar procedimento'} />
              </div>
            </form>

            {currentEntry ? (
              <form action={deleteAction} className='mt-3 flex justify-end'>
                <input type='hidden' name='patient_id' value={selectedPatientId} />
                <input type='hidden' name='entry_id' value={currentEntry.id} />
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
                        <span className='font-semibold'>{entry.procedure_name || entry.planned_procedure}</span>
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
  )
}
