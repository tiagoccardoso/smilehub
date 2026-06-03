import { sql } from '@/lib/neon'
import { resolveClinicByHost } from '@/lib/publicClinic'
import { unstable_noStore as noStore } from 'next/cache'

export async function GET(req: Request) {
  noStore()

  try {
    const clinic = await resolveClinicByHost(req)
    if (!clinic) return Response.json({ message: 'Site público da clínica não encontrado.', professionals: [] }, { status: 404 })

    const professionals = await sql`
      select id, full_name
        from professionals
       where clinic_id = ${clinic.id}::uuid
         and is_active = true
       order by full_name asc
    `

    return Response.json({ professionals })
  } catch {
    console.error('professionals.list')

    return Response.json(
      {
        message: 'Não foi possível carregar os profissionais cadastrados.',
        professionals: [],
      },
      { status: 500 },
    )
  }
}
