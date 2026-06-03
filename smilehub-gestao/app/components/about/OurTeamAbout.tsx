import Image from 'next/image'

import doc1 from '@/public/doc1.webp'
import doc2 from '@/public/doc2.webp'
import doc3 from '@/public/doc3.webp'
import doc4 from '@/public/doc4.webp'

function OurTeamAbout() {
  return (
    <section className='mx-auto w-full max-w-[1400px] px-5 py-16 md:px-10 md:py-24 lg:py-32'>
      <h2 className='text-center text-3xl font-bold md:text-5xl'>
        Nossa equipe
      </h2>
      <p className='mx-auto mb-8 mt-4 max-w-lg text-center text-slate-500 md:mb-16'>
        Conheça as mãos habilidosas e os corações gentis por trás do seu sorriso saudável
      </p>

      <div className='grid md:grid-cols-2 grid- gap-6 items-stretch text-balance'>
        <div
          className='p-2 border border-solid border-black rounded md:grid grid-cols-2 gap-6 '
          id='daniel'>
          <Image
            placeholder='blur'
            src={doc1}
            alt='Foto do Dr. Daniel Lee'
            height={1000}
            width={1000}
          />
          <div className='mt-4 md:mt-0 p-2'>
            <h3 className='font-bold text-lg'>Dr. Daniel Lee</h3>
            <p className='text-sm text-slate-500'>(Dentista)</p>

            <p className='text-sm text-slate-600 mt-4 '>
              O Dr. Daniel Lee é um dentista experiente, com mais de 20 anos de atuação. Formado pela Universidade de Medicina Odontológica, é conhecido por seu toque gentil e pelo compromisso com a saúde dos pacientes. Ele atualiza continuamente seus conhecimentos para oferecer atendimento de alta qualidade. Seu objetivo é melhorar a saúde, a aparência e a autoestima dos pacientes criando o sorriso dos sonhos.
            </p>
          </div>
        </div>
        <div
          className='p-2 border border-solid border-black rounded grid md:grid-cols-2  gap-6 '
          id='sarah'>
          <div className='order-2 sm:order-1 mt-4 md:mt-0 p-2'>
            <h3 className='font-bold text-lg'>Dr. Sarah Green</h3>
            <p className='text-sm text-slate-500'>(Odontopediatra)</p>
            <p className='text-sm text-slate-600 mt-4'>
              A Dra. Sarah Green é uma odontopediatra dedicada, com mais de 15 anos de experiência. Formou-se no renomado Children's Dental College e é apaixonada pela saúde bucal infantil. A Dra. Green é conhecida por sua abordagem paciente e cuidadosa, tornando as visitas ao dentista uma experiência positiva para crianças. Ela se dedica a oferecer excelente atendimento odontopediátrico e a educar seus pequenos pacientes sobre a importância da higiene bucal.
            </p>
          </div>

          <Image
            placeholder='blur'
            src={doc2}
            alt='Foto da Dra. Sarah Green'
            height={1000}
            width={1000}
            className='order-1 sm:order-2'
          />
        </div>
      </div>
      <div className='grid md:grid-cols-2 gap-6 items-stretch mt-8'>
        <div
          className='p-2 border border-solid border-black rounded md:grid grid-cols-2 gap-6 '
          id='emily'>
          <Image
            placeholder='blur'
            src={doc4}
            alt='Foto da Dra. Emily Rose'
            height={1000}
            width={1000}
          />
          <div className='mt-4 md:mt-0 p-2'>
            <h3 className='font-bold text-lg'>Dr. Emily Rose</h3>
            <p className='text-sm text-slate-500'>(Dentista estética)</p>
            <p className='text-sm text-slate-600 mt-4'>
              A Dra. Emily Rose é uma dentista estética dedicada à criação de sorrisos naturais e harmoniosos. Com anos de experiência em procedimentos cosméticos, combina precisão técnica com olhar artístico para ajudar pacientes a se sentirem mais confiantes. Ela personaliza cada plano de tratamento de acordo com as metas e necessidades de cada pessoa.
            </p>
          </div>
        </div>
        <div
          className='p-2 border border-solid border-black rounded grid md:grid-cols-2 gap-6 '
          id='michael'>
          <div className='order-2 sm:order-1 mt-4 md:mt-0 p-2'>
            <h3 className='font-bold text-lg'>Dr. Michael White</h3>
            <p className='text-sm text-slate-500'>(Endodontista)</p>
            <p className='text-sm text-slate-600 mt-4'>
              O Dr. Michael White é um endodontista habilidoso, com mais de 20 anos de experiência. Formou-se na respeitada Escola de Endodontia e é especialista no diagnóstico de dor dental, tratamento de canal e outros procedimentos relacionados ao interior do dente. Com amplo conhecimento e abordagem gentil, dedica-se a aliviar dores e salvar dentes, garantindo que os sorrisos de seus pacientes permaneçam saudáveis e bonitos.
            </p>
          </div>
          <Image
            placeholder='blur'
            src={doc3}
            alt='Foto do Dr. Michael White'
            height={1000}
            width={1000}
            className='order-1 sm:order-2'
          />
        </div>
      </div>
    </section>
  )
}
export default OurTeamAbout
