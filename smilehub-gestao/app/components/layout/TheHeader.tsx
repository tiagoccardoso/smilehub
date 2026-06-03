'use client'

import Image from 'next/image'
import Link from 'next/link'
import logo from '@/public/smilehub.webp'
import { useEffect, useState } from 'react'
import UpArrow from '../Icons/UpArrow'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/components/AppProvider'

function TheHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const pathName = usePathname()

  const [y, setY] = useState(0)

  const goTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }
  const { status, logout } = useAuth()

  useEffect(() => {
    const updateScroll = () => {
      setY(window.scrollY)
    }

    window.addEventListener('scroll', updateScroll)
    window.addEventListener('resize', updateScroll)

    return () => {
      window.removeEventListener('scroll', updateScroll)
      window.removeEventListener('resize', updateScroll)
    }
  }, [])

  return (
    <header
      className={`w-full z-50 sticky top-0 bg-sky-50  ${
        y > 0 ? 'border-b border-blue-400' : ''
      }`}>
      <div className='mx-auto flex flex-row items-center justify-between p-4  max-w-[1400px]'>
        <Link
          onClick={() => setIsOpen(false)}
          href='/'
          className=' flex gap-2 items-center text-xl font-bold md:text-3xl text-blue-600  hover:text-blue-800'>
          <Image
            src={logo}
            priority
            height={96}
            width={75}
            alt='logotipo da SmileHub'
          />
          SmileHub
        </Link>
        <nav className='hidden md:flex gap-6 items-center text-lg'>
          <Link
            href='/about'
            aria-label='Link para a página sobre nós'
            className={
              pathName === '/about'
                ? 'text-blue-600 font-bold'
                : '' + 'hover:text-blue-600'
            }>
            Sobre nós
          </Link>
          <Link
            href='/services'
            aria-label='Link para a página de serviços'
            className={
              pathName === '/services'
                ? 'text-blue-600 font-bold'
                : '' + 'hover:text-blue-600'
            }>
            Serviços
          </Link>
          <Link
            href='/agenda'
            aria-label='Link para acessar a agenda'
            className='p-2 rounded-full bg-blue-600 text-white hover:bg-blue-800 '>
            Agendar agora
          </Link>
          {status !== 'authenticated' && (
            <Link
              href='/admin'
              aria-label='Link para entrar no painel administrativo'
              className='p-2 text-blue-600 border border-blue-600 rounded hover:text-blue-800 hover:border-blue-800'>
              Entrar
            </Link>
          )}
          {status === 'authenticated' && (
            <>
              <Link
                href='/admin/agenda'
                aria-label='Link para o painel administrativo de agendamentos'
                className={
                  pathName.startsWith('/admin')
                    ? 'text-blue-600 font-bold'
                    : '' + 'hover:text-blue-600'
                }>
                Admin
              </Link>
              <button
                onClick={logout}
                className='p-2 text-blue-600 border border-blue-600 rounded  hover:text-blue-800 hover:border-blue-800'>
                Sair
              </button>
            </>
          )}
        </nav>
        <div className='flex md:hidden gap-3 items-center'>
          <button
            aria-label='botão para expandir o menu móvel'
            className={`hamburger ${isOpen ? 'open' : ''} focus:outline-none `}
            onClick={() => setIsOpen(prev => !prev)}>
            <span className='hamburger-top'></span>
            <span className='hamburger-middle'></span>
            <span className='hamburger-bottom'></span>
          </button>
          {status !== 'authenticated' && (
            <Link
              href='/admin'
              aria-label='Link para entrar no painel administrativo'
              className='rounded border border-blue-600 px-3 py-2 text-sm font-semibold text-blue-600 hover:border-blue-800 hover:text-blue-800'
              onClick={() => setIsOpen(false)}>
              Entrar
            </Link>
          )}
        </div>
      </div>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className='md:hidden p-4 bg-sky-50  mt-2 flex flex-col gap-2 text-center'>
          <Link
            href={'/about'}
            aria-label='Link para a página sobre nós'
            className='border rounded p-2 border-blue-400 animate-link'>
            Sobre nós
          </Link>
          <Link
            href={'/services'}
            aria-label='Link para a página de serviços'
            className='border rounded p-2 border-blue-400 animate-link'>
            Serviços
          </Link>
          <Link
            href={'/agenda'}
            aria-label='Link para acessar a agenda'
            className=' rounded p-2 bg-blue-600 text-white animate-link font-bold'>
            Agendar agora
          </Link>
          {status === 'authenticated' && (
            <>
              <Link
                href={'/admin/agenda'}
                aria-label='Link para o painel administrativo de agendamentos'
                className='border rounded p-2 border-blue-400 animate-link'>
                Admin
              </Link>
              <button
                className=' rounded p-2 bg-blue-600 text-white animate-link font-bold'
                onClick={logout}>
                Sair
              </button>
            </>
          )}
        </div>
      )}
      <div className='fixed bottom-0 -right-6 p-10 z-[10]'>
        <button
          aria-label='botão para voltar ao topo'
          onClick={goTop}
          className={
            y < 40
              ? 'hidden'
              : '' +
                'rounded-full border-2 border-blue-600 px-3 sm:px-4 hover:bg-slate-200 cursor-pointer aspect-square grid place-items-center'
          }>
          <UpArrow />
        </button>
      </div>
    </header>
  )
}
export default TheHeader
