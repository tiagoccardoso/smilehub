import type { Metadata } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/react'

import TheHeader from './components/layout/TheHeader'
import TheFooter from './components/layout/TheFooter'

import Loader from './components/Loader'
import AppProvider from './components/AppProvider'
import { Suspense } from 'react'
import Spinner from './components/Spinner'

export const metadata: Metadata = {
  title: {
    default: 'SmileHub | Experiência odontológica premium',
    template: `%s | SmileHub`,
  },
  description:
    'A SmileHub oferece uma experiência odontológica premium, digital e acolhedora para clínicas que desejam encantar pacientes desde o primeiro contato.',
  metadataBase: new URL('https://smilehub.vercel.app/'),

  openGraph: {
    type: 'website',
    url: 'https://smilehub.vercel.app/',
    title: 'SmileHub | Experiência odontológica premium',
    description:
      'A SmileHub oferece uma experiência odontológica premium, digital e acolhedora para clínicas que desejam encantar pacientes desde o primeiro contato.',
    images: [
      {
        url: 'https://res.cloudinary.com/dkofkuquf/image/upload/v1707573685/nuxtshop/rlviwuatbxvwxex336eh.webp',
        alt: 'SmileHub',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: 'https://smilehub.vercel.app/',
    title: 'SmileHub | Experiência odontológica premium',
    description:
      'A SmileHub oferece uma experiência odontológica premium, digital e acolhedora para clínicas que desejam encantar pacientes desde o primeiro contato.',
    images: [
      'https://res.cloudinary.com/dkofkuquf/image/upload/v1707573685/nuxtshop/rlviwuatbxvwxex336eh.webp',
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='pt-BR'>
      <head>
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
        <link href='https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap' rel='stylesheet' />
      </head>
      <body>
        <AppProvider>
          <div className='flex min-h-screen flex-col'>
            <TheHeader />
            <Suspense fallback={<Spinner />}>
              <Loader />
            </Suspense>
            {children}
            <Analytics />
          </div>
          <TheFooter />
        </AppProvider>
      </body>
    </html>
  )
}
