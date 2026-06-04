import { requireClinicAccess } from '@/lib/clinic'
import { removePublicImage, savePublicImage } from '@/lib/imageUpload'
import { sql } from '@/lib/neon'

export async function POST(req: Request) {
  try {
    const { clinic } = await requireClinicAccess(['superadmin', 'admin'])
    const formData = await req.formData()
    const uploadedLogo = await savePublicImage(formData.get('logo'), 'clinic-logo')
    if (!uploadedLogo) return Response.json({ message: 'Envie uma imagem válida para a logo.' }, { status: 400 })

    await sql`update public.clinics set logo_url = ${uploadedLogo}, updated_at = now() where id = ${clinic.id}::uuid`
    if (clinic.logo_url && clinic.logo_url !== uploadedLogo) await removePublicImage(clinic.logo_url)
    return Response.json({ message: 'Logo atualizada', logoUrl: uploadedLogo })
  } catch (error: any) {
    console.error('logo.post')
    return Response.json({ message: error?.message || 'Não foi possível atualizar a logo.' }, { status: 400 })
  }
}
