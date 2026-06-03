'use client'

import Image from 'next/image'
import Link from 'next/link'
import logo from '@/public/smilehub.webp'
import { useEffect, useState } from 'react'
import UpArrow from '../Icons/UpArrow'
import { usePathname } from 'next/navigation'

const publicLinks = [
  { href: '/', label: 'Início' },
  { href: '/about', label: 'Sobre nós' },
  { href: '/services', label: 'Serviços' },
]

function TheHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const [y, setY] = useState(0)
  const pathName = usePathname()

  const goTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  useEffect(() => {
    const updateScroll = () => setY(window.scrollY)
    window.addEventListener('scroll', updateScroll)
    window.addEventListener('resize', updateScroll)
    updateScroll()
    return () => {
      window.removeEventListener('scroll', updateScroll)
      window.removeEventListener('resize', updateScroll)
    }
  }, [])

  const linkClass = (href: string) => {
    const active = href === '/' ? pathName === href : pathName.startsWith(href)
    return `rounded-full px-4 py-2 text-sm font-semibold transition ${
      active
        ? 'bg-white/70 text-slate-950 shadow-sm'
        : 'text-slate-600 hover:bg-white/55 hover:text-slate-950'
    }`
  }

  return (
    <header className={`premium-header ${y > 0 ? 'shadow-[0_22px_54px_rgba(10,25,47,0.08)]' : ''}`}>
      <div className='premium-container flex h-20 items-center justify-between gap-4'>
        <Link onClick={() => setIsOpen(false)} href='/' className='group flex items-center gap-3'>
          <span className='premium-logo-mark'>
            <Image src={logo} priority height={44} width={44} alt='Logotipo da SmileHub' className='h-11 w-11 object-contain' />
          </span>
          <span className='leading-none'>
            <span className='block font-[var(--font-display)] text-2xl font-bold tracking-[-0.04em] text-slate-950'>SmileHub</span>
            <span className='hidden text-[0.64rem] font-extrabold uppercase tracking-[0.24em] text-slate-500 sm:block'>Dental Experience</span>
          </span>
        </Link>

        <nav className='hidden items-center gap-1 rounded-full border border-white/60 bg-white/35 p-1 backdrop-blur md:flex'>
          {publicLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className='hidden items-center gap-3 md:flex'>
          <Link href='/agenda' aria-label='Link para acessar a agenda' className='premium-button px-5 py-3'>
            Agendar agora
          </Link>
        </div>

        <button
          aria-label='Abrir menu móvel'
          className={`hamburger md:hidden ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen((prev) => !prev)}
          type='button'>
          <span className='hamburger-top'></span>
          <span className='hamburger-middle'></span>
          <span className='hamburger-bottom'></span>
        </button>
      </div>

      {isOpen && (
        <div className='border-t border-white/60 bg-white/70 p-4 shadow-xl backdrop-blur-xl md:hidden'>
          <div className='premium-container flex flex-col gap-2'>
            {publicLinks.map((link) => (
              <Link key={link.href} onClick={() => setIsOpen(false)} href={link.href} className='animate-link rounded-2xl border border-slate-950/10 bg-white/75 px-4 py-3 text-center font-semibold text-slate-700'>
                {link.label}
              </Link>
            ))}
            <Link onClick={() => setIsOpen(false)} href='/agenda' className='premium-button animate-link mt-2 w-full'>
              Agendar agora
            </Link>
          </div>
        </div>
      )}

      {y > 160 && (
        <button onClick={goTop} className='fixed bottom-5 right-5 z-50 rounded-full bg-slate-950 p-3 text-white shadow-2xl transition hover:-translate-y-1 hover:bg-black' aria-label='Voltar ao topo' type='button'>
          <UpArrow />
        </button>
      )}
    </header>
  )
}

export default TheHeader
