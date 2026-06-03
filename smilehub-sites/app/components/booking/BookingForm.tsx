'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { formatDate, formatTime, incrementTimeByOneHour } from '@/lib/dateAndTimeUtils'
import SuccessBox from './SuccessBox'
import BookingHeader from './BookingHeader'

type Professional = { id: string; full_name: string }
type ApiPayload = { message?: string; professionals?: Professional[]; availableTimes?: string[] }

const toISODate = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '')

async function readJsonSafely(response: Response): Promise<ApiPayload> {
  const text = await response.text()

  if (!text) return {}

  try {
    return JSON.parse(text) as ApiPayload
  } catch {
    return { message: text }
  }
}

function BookingForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [professionalId, setProfessionalId] = useState('')
  const [professionalsStatus, setProfessionalsStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [professionalsError, setProfessionalsError] = useState('')
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [selectedTime, setSelectedTime] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(false)
  const successBoxRef = useRef<HTMLDivElement | null>(null)

  const isLoadingProfessionals = professionalsStatus === 'loading'
  const hasProfessionals = professionals.length > 0
  const isDisabled = !firstName || !lastName || !email || !phone || !selectedTime || !professionalId || isLoadingProfessionals || !hasProfessionals

  useEffect(() => {
    let ignore = false

    async function loadProfessionals() {
      setProfessionalsStatus('loading')
      setProfessionalsError('')

      try {
        const res = await fetch('/api/professionals', { cache: 'no-store' })
        const data = await readJsonSafely(res)

        if (!res.ok) {
          throw new Error(data.message || 'Erro ao buscar profissionais.')
        }

        const nextProfessionals = Array.isArray(data.professionals) ? data.professionals : []

        if (ignore) return
        setProfessionals(nextProfessionals)
        setProfessionalId(nextProfessionals[0]?.id || '')
        setProfessionalsStatus('success')
      } catch (err) {
        if (ignore) return
        setProfessionals([])
        setProfessionalId('')
        setProfessionalsStatus('error')
        setProfessionalsError(err instanceof Error ? err.message : 'Não foi possível carregar profissionais.')
      }
    }

    loadProfessionals()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadAvailability() {
      if (!selectedDate || !professionalId) {
        setAvailableTimes([])
        setSelectedTime('')
        return
      }

      setError('')

      try {
        const res = await fetch(`/api/availability?date=${toISODate(selectedDate)}&professionalId=${professionalId}`, { cache: 'no-store' })
        const body = await readJsonSafely(res)

        if (!res.ok) {
          throw new Error(body.message || 'Erro ao buscar horários.')
        }

        const nextTimes = Array.isArray(body.availableTimes) ? body.availableTimes : []
        if (ignore) return
        setAvailableTimes(nextTimes)
        setSelectedTime(nextTimes[0] || '')
      } catch (err) {
        if (ignore) return
        setAvailableTimes([])
        setSelectedTime('')
        setError(err instanceof Error ? err.message : 'Erro ao buscar horários.')
      }
    }

    loadAvailability()

    return () => {
      ignore = true
    }
  }, [selectedDate, professionalId])

  async function handleAppointment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, phone, message, date: toISODate(selectedDate), time: selectedTime, professionalId }),
      })
      const body = await readJsonSafely(res)

      if (!res.ok) {
        setError(body.message || 'Não foi possível concluir o agendamento.')
        return
      }

      setCreated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir o agendamento.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (created && successBoxRef.current) successBoxRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [created])

  return (
    <section className='booking-shell'>
      <div className='premium-container'>
        {created ? (
          <SuccessBox ref={successBoxRef}>
            <div className='my-8'>
              <span className='premium-eyebrow'>Consulta enviada</span>
              <h1 className='premium-title mt-5'>Consulta agendada</h1>
              <p className='premium-subtitle mx-auto mt-6 max-w-2xl'>
                Obrigado! Sua consulta foi agendada para {formatDate(String(selectedDate))} às {formatTime(selectedTime)} - {incrementTimeByOneHour(selectedTime)}.
              </p>
            </div>
          </SuccessBox>
        ) : (
          <>
            <BookingHeader />
            <div className='mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-start'>
              <form className='glass-card-strong rounded-[2rem] p-6 md:p-10' onSubmit={handleAppointment}>
                <div className='mb-7 flex flex-col gap-2 border-b border-slate-950/10 pb-6'>
                  <span className='text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500'>Solicitação de agendamento</span>
                  <h2 className='text-3xl font-bold tracking-[-0.04em] text-slate-950'>Dados do paciente</h2>
                </div>

                {isLoadingProfessionals && <p className='mb-4 rounded-2xl bg-slate-100 p-4 text-center text-slate-600'>Carregando profissionais...</p>}
                {professionalsStatus === 'error' && <p className='mb-4 rounded-2xl bg-red-50 p-4 text-center text-red-700'>{professionalsError}</p>}
                {professionalsStatus === 'success' && !hasProfessionals && <p className='mb-4 rounded-2xl bg-slate-100 p-4 text-center text-slate-600'>Nenhum profissional cadastrado para agendamento no momento.</p>}
                {professionalsStatus === 'success' && hasProfessionals && <p className='mb-4 rounded-2xl bg-emerald-50 p-4 text-center text-emerald-700'>Profissionais carregados com sucesso.</p>}
                {error && <p className='mb-4 rounded-2xl bg-red-50 p-4 text-center text-red-700'>{error}</p>}

                <div className='grid gap-4 md:grid-cols-2'>
                  <div>
                    <label htmlFor='firstName'>Nome</label>
                    <input id='firstName' disabled={isLoading} type='text' placeholder='Ex: Ana' value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor='lastName'>Sobrenome</label>
                    <input id='lastName' disabled={isLoading} type='text' placeholder='Ex: Silva' value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </div>

                <div className='mt-4 grid gap-4 md:grid-cols-2'>
                  <div>
                    <label htmlFor='email'>E-mail</label>
                    <input id='email' disabled={isLoading} type='email' placeholder='ana@email.com' value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor='phone'>Telefone</label>
                    <input id='phone' disabled={isLoading} type='text' placeholder='+55 11 99999-9999' value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                </div>

                <div className='mt-4 grid gap-4 md:grid-cols-3'>
                  <div>
                    <label htmlFor='professional'>Profissional</label>
                    <select id='professional' value={professionalId} onChange={e => setProfessionalId(e.target.value)} disabled={isLoading || isLoadingProfessionals || !hasProfessionals}>
                      <option value=''>{isLoadingProfessionals ? 'Carregando...' : 'Selecione'}</option>
                      {professionals.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Data</label>
                    <DatePicker selected={selectedDate} onChange={(d: Date | null) => setSelectedDate(d)} dateFormat='dd/MM/yyyy' minDate={new Date()} />
                  </div>
                  <div>
                    <label htmlFor='time'>Horário</label>
                    <select id='time' value={selectedTime} onChange={e => setSelectedTime(e.target.value)} disabled={isLoading || !availableTimes.length}>
                      {availableTimes.length ? availableTimes.map(t => <option key={t} value={t}>{formatTime(t)} - {incrementTimeByOneHour(t)}</option>) : <option value=''>Sem horários disponíveis</option>}
                    </select>
                  </div>
                </div>

                <div className='mt-4'>
                  <label htmlFor='message'>Mensagem opcional</label>
                  <textarea id='message' disabled={isLoading} value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder='Como podemos ajudar?' />
                </div>

                <button type='submit' className='premium-button mt-6 w-full' disabled={isDisabled || isLoading}>
                  {isLoading ? 'Enviando...' : 'Agendar consulta'}
                </button>
              </form>

              <aside className='grid gap-5'>
                <div className='premium-dark rounded-[2rem] p-8'>
                  <span className='premium-eyebrow text-white/70'>Informações</span>
                  <h3 className='mt-5 text-3xl font-bold tracking-[-0.04em] text-white'>Atendimento organizado do início ao fim.</h3>
                  <p className='mt-4 leading-7 text-white/70'>O formulário mantém a lógica original de profissionais e horários disponíveis, agora com acabamento premium.</p>
                </div>
                <div className='glass-card rounded-[2rem] p-7'>
                  <span className='premium-icon'>✓</span>
                  <h3 className='mt-5 text-xl font-bold'>Confirmação rápida</h3>
                  <p className='mt-3 leading-6 text-slate-600'>Após o envio, a solicitação fica registrada conforme a configuração da clínica.</p>
                </div>
                <div className='glass-card rounded-[2rem] p-7'>
                  <span className='premium-icon'>◌</span>
                  <h3 className='mt-5 text-xl font-bold'>Experiência mobile</h3>
                  <p className='mt-3 leading-6 text-slate-600'>Layout responsivo para pacientes acessarem pelo celular com facilidade.</p>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default BookingForm
