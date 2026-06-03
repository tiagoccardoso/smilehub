import Image from 'next/image'
import doc1 from '@/public/doc1.webp'
import doc2 from '@/public/doc2.webp'
import doc3 from '@/public/doc3.webp'
import doc4 from '@/public/doc4.webp'
import Link from 'next/link'

function Team() {
  return (
    <section>
      <div className='mx-auto w-full max-w-7xl px-5 py-16 md:px-10 md:py-24 lg:py-32'>
        <h2 className='text-center text-3xl font-bold md:text-5xl'>
          Nossa equipe
        </h2>
        <p className='mx-auto mb-8 mt-4 max-w-lg text-center text-[#636262] md:mb-16'>
          Conheça as mãos habilidosas e os corações gentis por trás do seu sorriso saudável
        </p>
        <div className='mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 '>
          <Link
            href='/about/#daniel'
            aria-label='Link para a seção do Dr. Daniel Lee na página sobre nós'
            className='mx-auto flex max-w-xs flex-col items-center gap-4 px-8 py-6 text-center shadow-lg'>
            <Image
              height={208}
              width={208}
              src={doc1}
              alt='Foto do Dr. Daniel Lee'
              className='mb-4 inline-block h-52 w-full object-cover '
            />
            <p className='font-bold'>Dr. Daniel Lee</p>
            <p className='text-sm text-[#636262]'>
              Mestre dos sorrisos <br />
              (Dentista)
            </p>
          </Link>
          <Link
            href='/about/#sarah'
            aria-label='Link para a seção da Dra. Sarah Green na página sobre nós'
            className='mx-auto flex max-w-xs flex-col items-center gap-4 px-8 py-6 text-center shadow-lg'>
            <Image
              src={doc2}
              height={208}
              width={208}
              alt='Foto da Dra. Sarah Green'
              className='mb-4 inline-block h-52 w-full object-cover'
            />
            <p className='font-bold'>Dr. Sarah Green</p>
            <p className='text-sm text-[#636262]'>
              Toque gentil <br />
              (Odontopediatra)
            </p>
          </Link>
          <Link
            href='/about/#emily'
            aria-label='Link para a seção da Dra. Emily Rose na página sobre nós'
            className='mx-auto flex max-w-xs flex-col items-center gap-4 px-8 py-6 text-center shadow-lg'>
            <Image
              src={doc4}
              height={208}
              width={208}
              alt='Foto da Dra. Emily Rose'
              className='mb-4 inline-block h-52 w-full object-cover'
            />
            <p className='font-bold'>Dr. Emily Rose</p>
            <p className='text-sm text-[#636262]'>
              Artista da precisão <br />
              (Dentista estética)
            </p>
          </Link>
          <Link
            href='/about/#michael'
            aria-label='Link para a seção do Dr. Michael White na página sobre nós'
            className='mx-auto flex max-w-xs flex-col items-center gap-4 px-8 py-6 text-center shadow-lg'>
            <Image
              src={doc3}
              height={208}
              width={208}
              alt='Foto do Dr. Michael White'
              className='mb-4 inline-block h-52 w-full object-cover'
            />
            <p className='font-bold'>Dr. Michael White</p>
            <p className='text-sm text-[#636262]'>
              Especialista em restauração <br />
              (Endodontista)
            </p>
          </Link>
        </div>
      </div>
    </section>
  )
}
export default Team
