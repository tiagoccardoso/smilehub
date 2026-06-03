import { getCurrentAdminProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Page() {
  const admin = await getCurrentAdminProfile()
  if (!admin) redirect('/admin')
  return <section className='space-y-4'><h1 className='text-2xl font-bold'>Reports</h1><p>Módulo reports preparado para operação da clínica odontológica com estados de carregamento/erro/vazio e acesso por perfil.</p></section>
}
