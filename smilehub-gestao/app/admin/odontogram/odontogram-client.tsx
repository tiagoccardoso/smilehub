'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SubmitButton } from '../_components/submit-button'
import {
  ODONTOGRAM_STATUS,
  ODONTOGRAM_STATUS_STYLES,
  type OdontogramEntry,
  type PatientOption,
  type ProcedureOption,
  type ToothCode,
} from './odontogram-data'

type Action = (formData: FormData) => void | Promise<void>
type Arch = 'upper' | 'lower'
type ToothKind = 'incisor' | 'canine' | 'premolar' | 'molar'

type OdontogramClientProps = {
  patients: PatientOption[]
  procedures: ProcedureOption[]
  entries: OdontogramEntry[]
  selectedPatientId: string
  saveAction: Action
  deleteAction: Action
}

const upperRight = ['18', '17', '16', '15', '14', '13', '12', '11'] as ToothCode[]
const upperLeft = ['21', '22', '23', '24', '25', '26', '27', '28'] as ToothCode[]
const lowerRight = ['48', '47', '46', '45', '44', '43', '42', '41'] as ToothCode[]
const lowerLeft = ['31', '32', '33', '34', '35', '36', '37', '38'] as ToothCode[]

const emptyStatusStyle = {
  dot: 'bg-slate-300',
  bg: 'bg-white',
  border: 'border-slate-200',
  text: 'text-slate-600',
  ring: 'ring-slate-200',
}

function normalizeDate(value: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function toothKind(toothCode: ToothCode): ToothKind {
  if (['18', '17', '16', '26', '27', '28', '48', '47', '46', '36', '37', '38'].includes(toothCode)) return 'molar'
  if (['15', '14', '24', '25', '45', '44', '34', '35'].includes(toothCode)) return 'premolar'
  if (['13', '23', '43', '33'].includes(toothCode)) return 'canine'
  return 'incisor'
}

function toothImageSrc(toothCode: ToothCode, arch: Arch) {
  return `/odontogram/teeth/${arch}-${toothKind(toothCode)}.svg`
}

function statusLabel(status: string) {
  return ODONTOGRAM_STATUS.find(item => item.value === status)?.label ?? status
}

function statusStyle(status?: string | null) {
  return status ? ODONTOGRAM_STATUS_STYLES[status] ?? emptyStatusStyle : emptyStatusStyle
}

function ToothButton({
  code,
  arch,
  activeEntry,
  selected,
  disabled,
  onSelect,
}: {
  code: ToothCode
  arch: Arch
  activeEntry?: OdontogramEntry
  selected: boolean
  disabled: boolean
  onSelect: (code: ToothCode) => void
}) {
  const hasEntry = Boolean(activeEntry)
  const style = statusStyle(activeEntry?.status)
  const label = activeEntry ? statusLabel(activeEntry.status) : 'Sem procedimento'

  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() => onSelect(code)}
      className={`group relative flex min-w-12 flex-col items-center rounded-2xl border p-2 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${hasEntry ? `${style.bg} ${style.border}` : 'border-slate-200 bg-white'} ${selected ? `ring-4 ${style.ring} border-blue-500 shadow-lg` : 'shadow-sm'}`}
      aria-label={`Selecionar dente ${code}. Status: ${label}`}
    >
      <span className={`absolute right-2 top-2 h-3 w-3 rounded-full ${style.dot}`} aria-hidden='true' />
      <img
        src={toothImageSrc(code, arch)}
        alt={`Imagem realista do dente ${code}`}
        className='odontogram-tooth-image h-24 w-auto object-contain transition duration-200 group-hover:scale-105 sm:h-28'
      />
      <span className='mt-1 text-xs font-bold text-slate-800'>{code}</span>
      <span className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold leading-tight ${hasEntry ? `${style.bg} ${style.text}` : 'bg-slate-100 text-slate-500'}`}>
        {label}
      </span>
    </button>
  )
}

function StatusLegend() {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
      <p className='text-xs font-extrabold uppercase tracking-wide text-slate-500'>Legenda de status</p>
      <div className='mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
        {ODONTOGRAM_STATUS.map(status => {
          const style = statusStyle(status.value)
          return (
            <div key={status.value} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${style.bg} ${style.border} ${style.text}`}>
              <span className={`h-3 w-3 rounded-full ${style.dot}`} aria-hidden='true' />
              <span>{status.label}</span>
            </div>
          )
        })}
      </div>
      <p className='mt-2 text-xs text-slate-500'>Além da cor, cada dente exibe o texto do status para facilitar a leitura e acessibilidade.</p>
    </div>
  )
}

function Quadrant({
  title,
  teeth,
  arch,
  entriesByTooth,
  selectedTooth,
  disabled,
  onSelect,
}: {
  title: string
  teeth: ToothCode[]
  arch: Arch
  entriesByTooth: Map<string, OdontogramEntry[]>
  selectedTooth: ToothCode | null
  disabled: boolean
  onSelect: (code: ToothCode) => void
}) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
      <p className='mb-3 text-center text-xs font-extrabold uppercase tracking-wide text-slate-500'>{title}</p>
      <div className='grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-4 2xl:grid-cols-8'>
        {teeth.map(code => (
          <ToothButton
            key={code}
            code={code}
            arch={arch}
            activeEntry={entriesByTooth.get(code)?.[0]}
            selected={selectedTooth === code}
            disabled={disabled}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

export function OdontogramClient({ patients, procedures, entries, selectedPatientId, saveAction, deleteAction }: OdontogramClientProps) {
  const router = useRouter()
  const [selectedTooth, setSelectedTooth] = useState<ToothCode | null>(null)
  const selectedPatient = patients.find(patient => patient.id === selectedPatientId)

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
        <div className='space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-5'>
          <div className='grid gap-4 lg:grid-cols-2'>
            <Quadrant title='Superior direito' teeth={upperRight} arch='upper' entriesByTooth={entriesByTooth} selectedTooth={selectedTooth} disabled={disabledChart} onSelect={setSelectedTooth} />
            <Quadrant title='Superior esquerdo' teeth={upperLeft} arch='upper' entriesByTooth={entriesByTooth} selectedTooth={selectedTooth} disabled={disabledChart} onSelect={setSelectedTooth} />
          </div>
          <div className='mx-auto h-px max-w-4xl bg-slate-300' />
          <div className='grid gap-4 lg:grid-cols-2'>
            <Quadrant title='Inferior direito' teeth={lowerRight} arch='lower' entriesByTooth={entriesByTooth} selectedTooth={selectedTooth} disabled={disabledChart} onSelect={setSelectedTooth} />
            <Quadrant title='Inferior esquerdo' teeth={lowerLeft} arch='lower' entriesByTooth={entriesByTooth} selectedTooth={selectedTooth} disabled={disabledChart} onSelect={setSelectedTooth} />
          </div>
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
              const style = statusStyle(entry.status)
              return (
                <button key={entry.id} type='button' onClick={() => setSelectedTooth(entry.tooth_code)} className={`w-full rounded-xl border p-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${style.border} ${style.bg}`}>
                  <span className='font-semibold'>Dente {entry.tooth_code}</span>
                  <span className='block text-slate-600'>{entry.procedure_name || entry.planned_procedure || 'Procedimento sem descrição'}</span>
                  <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${style.bg} ${style.text}`}><span className={`h-2 w-2 rounded-full ${style.dot}`} />{statusLabel(entry.status)}</span>
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
              <div>
                <p className='text-sm font-semibold uppercase tracking-wide text-blue-700'>Dente selecionado</p>
                <h2 id='odontogram-modal-title' className='text-2xl font-bold'>Dente {selectedTooth}</h2>
                <p className='text-sm text-slate-600'>{selectedPatient?.full_name}</p>
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
                    const style = statusStyle(entry.status)
                    return (
                      <li key={entry.id} className={`rounded-xl border bg-white p-3 ${style.border}`}>
                        <span className='font-semibold'>{entry.procedure_name || entry.planned_procedure}</span>
                        <span className={`mt-1 block text-xs font-bold ${style.text}`}>{statusLabel(entry.status)} · {normalizeDate(entry.scheduled_date) || 'Sem data prevista'}</span>
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
