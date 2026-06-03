import Link from 'next/link'

function BookVisit() {
  return (
    <section className='bg-[#276981] w-full h-full text-white'>
      <div className=' flex items-center flex-col text-center my-20'>
        <h4 className='font-bold  text-4xl'>Agende sua consulta online</h4>
        <p className='mt-8 text-lg'>
          Veja os horários disponíveis e aproveite a odontologia bem feita. +Clareamento dental grátis para sempre.
        </p>
        <Link
          href='/agenda'
          className='mx-auto mt-16 inline-block rounded-md bg-blue-800 hover:bg-blue-600 px-8 py-4 text-center font-semibold text-white'>
          AGENDAR ONLINE
        </Link>
      </div>
    </section>
  )
}
export default BookVisit
