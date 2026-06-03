import { requireClinicAccess } from '@/lib/clinic'
import { sql } from '@/lib/neon'

const optional = (value: unknown) => String(value ?? '').trim() || null

export async function GET() {
  try {
    const { clinic } = await requireClinicAccess(['superadmin', 'admin'])
    return Response.json({ clinic })
  } catch (error) {
    console.error('clinic-settings.get', error)
    return Response.json({ message: 'Não autorizado' }, { status: 401 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { clinic } = await requireClinicAccess(['superadmin', 'admin'])
    const body = await req.json()

    await sql`
      update clinics
         set name = coalesce(${optional(body.name)}, name),
             public_name = ${optional(body.publicName)},
             document_number = ${optional(body.documentNumber)},
             phone = ${optional(body.phone)},
             whatsapp = ${optional(body.whatsapp)},
             email = ${optional(body.email)},
             logo_url = ${optional(body.logoUrl)},
             primary_color = coalesce(${optional(body.primaryColor)}, primary_color),
             public_description = ${optional(body.publicDescription)},
             postal_code = ${optional(body.postalCode)},
             street = ${optional(body.street)},
             number = ${optional(body.number)},
             complement = ${optional(body.complement)},
             district = ${optional(body.district)},
             city = ${optional(body.city)},
             state = ${optional(body.state)},
             country = coalesce(${optional(body.country)}, country),
             website_enabled = case
               when exists (
                 select 1 from clinic_entitlements
                  where clinic_id = ${clinic.id}::uuid and feature_code = 'public_website' and enabled = true
               ) then coalesce(${typeof body.websiteEnabled === 'boolean' ? body.websiteEnabled : null}, website_enabled)
               else false
             end
       where id = ${clinic.id}::uuid
       returning id
    `

    return Response.json({ message: 'Configurações da clínica atualizadas' })
  } catch (error) {
    console.error('clinic-settings.patch', error)
    return Response.json({ message: 'Não foi possível atualizar a clínica' }, { status: 500 })
  }
}
