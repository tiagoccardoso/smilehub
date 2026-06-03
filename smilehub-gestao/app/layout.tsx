import type { Metadata } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import Loader from './components/Loader'
import AppProvider from './components/AppProvider'
import { Suspense } from 'react'
import Spinner from './components/Spinner'

export const metadata: Metadata = {
  title: { default: 'SmileHub Gestão', template: `%s | SmileHub Gestão` },
  description: 'Área administrativa multi-clínica do SmileHub.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://gestao.smilehub.com.br/'),
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='pt-BR'>
      <body>
        <AppProvider>
          <Suspense fallback={<Spinner />}><Loader /></Suspense>
          {children}
          <Analytics />
        </AppProvider>
      </body>
    </html>
  )
}
