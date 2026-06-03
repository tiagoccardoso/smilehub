import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/neon'
import { getSiteContent, type SiteContentSection } from '@/lib/siteContent'
import { requireClinicAccess, statusLabel } from '@/lib/clinic'
import { SubmitButton } from '../_components/submit-button'
import { FormFeedback } from '../_components/form-feedback'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const sections: { key: SiteContentSection; label: string; imageLabel: string }[] = [
  { key: 'home', label: 'Página Inicial', imageLabel: 'Banner da página inicial' },
  { key: 'about', label: 'Sobre Nós', imageLabel: 'Imagem da seção Sobre Nós' },
  { key: 'services', label: 'Serviços', imageLabel: 'Imagem de destaque dos serviços' },
]
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'site-content')
const publicPrefix = '/uploads/site-content'
const allowedTypes = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['image/gif', 'gif']])
const maxBytes = 5 * 1024 * 1024
const optional = (value: FormDataEntryValue | null) => String(value || '').trim() || null

async function requireSettingsAccess() {
  return requireClinicAccess(['superadmin', 'admin'])
}

async function saveUploadedImage(file: FormDataEntryValue | null, section: SiteContentSection | 'clinic-logo') {
  if (!(file instanceof File) || file.size === 0) return null
  if (!allowedTypes.has(file.type)) throw new Error('Tipo de imagem inválido')
  if (file.size > maxBytes) throw new Error('Imagem maior que 5MB')
  await mkdir(uploadDir, { recursive: true })
  const ext = allowedTypes.get(file.type)
  const safeName = `${section}-${Date.now()}-${randomUUID()}.${ext}`
  const target = path.join(uploadDir, safeName)
  await writeFile(target, Buffer.from(await file.arrayBuffer()))
  return `${publicPrefix}/${safeName}`
}

async function removePublicImage(imageUrl: string | null) {
  if (!imageUrl?.startsWith(publicPrefix)) return
  try { await unlink(path.join(process.cwd(), 'public', imageUrl)) } catch {}
}

async function saveClinicSettings(formData: FormData) {
  'use server'
  const { clinic } = await requireSettingsAccess()
  let target = '/admin/settings#clinic'
  try {
    const uploadedLogo = await saveUploadedImage(formData.get('logo'), 'clinic-logo')
    const currentLogo = optional(formData.get('current_logo_url'))
    const removeLogo = formData.get('remove_logo') === 'on'
    const logoUrl = removeLogo ? null : uploadedLogo || currentLogo

    await sql`
      update clinics
         set name = ${optional(formData.get('name')) || clinic.name},
             public_name = ${optional(formData.get('public_name'))},
             document_number = ${optional(formData.get('document_number'))},
             phone = ${optional(formData.get('phone'))},
             whatsapp = ${optional(formData.get('whatsapp'))},
             email = ${optional(formData.get('email'))},
             logo_url = ${logoUrl},
             primary_color = ${optional(formData.get('primary_color')) || '#2563eb'},
             public_description = ${optional(formData.get('public_description'))},
             postal_code = ${optional(formData.get('postal_code'))},
             street = ${optional(formData.get('street'))},
             number = ${optional(formData.get('number'))},
             complement = ${optional(formData.get('complement'))},
             district = ${optional(formData.get('district'))},
             city = ${optional(formData.get('city'))},
             state = ${optional(formData.get('state'))},
             country = ${optional(formData.get('country')) || 'Brasil'},
             website_enabled = case
               when exists (
                 select 1 from clinic_entitlements
                  where clinic_id = ${clinic.id}::uuid and feature_code = 'public_website' and enabled = true
               ) then ${formData.get('website_enabled') === 'on'}
               else false
             end
       where id = ${clinic.id}::uuid
    `

    if ((uploadedLogo || removeLogo) && clinic.logo_url && clinic.logo_url !== logoUrl) await removePublicImage(clinic.logo_url)
    target += '?ok=Configura%C3%A7%C3%B5es+da+cl%C3%ADnica+salvas+com+sucesso'
  } catch (error) {
    console.error('clinic-settings.save', error)
    target += '?error=N%C3%A3o+foi+poss%C3%ADvel+salvar+as+configura%C3%A7%C3%B5es+da+cl%C3%ADnica'
  }
  revalidatePath('/admin/settings')
  redirect(target)
}

async function saveSettings(formData: FormData) {
  'use server'
  const { clinic } = await requireSettingsAccess()
  const section = String(formData.get('section') || '') as SiteContentSection
  let target = `/admin/settings#${section}`
  try {
    if (!sections.some(item => item.key === section)) throw new Error('Seção inválida')
    const current = await sql`select image_url from site_content_settings where clinic_id = ${clinic.id}::uuid and section = ${section} limit 1`
    const currentImage = (current as any[])[0]?.image_url || null
    const uploadedImage = await saveUploadedImage(formData.get('image'), section)
    const removeImage = formData.get('remove_image') === 'on'
    const imageUrl = removeImage ? null : uploadedImage || currentImage

    await sql`
      insert into site_content_settings (clinic_id, section, title, subtitle, body, image_url, extra)
      values (${clinic.id}::uuid, ${section}, ${optional(formData.get('title'))}, ${optional(formData.get('subtitle'))}, ${optional(formData.get('body'))}, ${imageUrl}, '{}'::jsonb)
      on conflict (clinic_id, section) do update set title = excluded.title, subtitle = excluded.subtitle, body = excluded.body, image_url = excluded.image_url, updated_at = now()
    `
    if ((uploadedImage || removeImage) && currentImage && currentImage !== imageUrl) await removePublicImage(currentImage)
    target += '?ok=Configura%C3%A7%C3%B5es+salvas+com+sucesso'
  } catch (error) {
    console.error('settings.save')
    target += '?error=N%C3%A3o+foi+poss%C3%ADvel+salvar.+Valide+texto+e+imagem'
  }
  revalidatePath('/admin/settings'); revalidatePath('/'); revalidatePath('/about'); revalidatePath('/services')
  redirect(target)
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const { clinic } = await requireSettingsAccess()
  const params = (await searchParams) ?? {}
  const content = await getSiteContent(clinic.id)
  const canEnablePublicWebsite = await sql`select 1 from clinic_entitlements where clinic_id = ${clinic.id}::uuid and feature_code = 'public_website' and enabled = true limit 1`
  const hasPublicWebsite = (canEnablePublicWebsite as unknown[]).length > 0

  return (
    <section className='space-y-6'>
      <div>
        <p className='text-sm font-semibold uppercase tracking-wide text-blue-700'>Configurações</p>
        <h1 className='text-2xl font-bold'>Configurações</h1>
        <p className='text-sm text-gray-600'>Gerencie dados da clínica, conteúdo público e informações exibidas no site.</p>
      </div>
      <FormFeedback ok={params.ok} error={params.error}/>
      <div role='tablist' aria-label='Abas de configurações' className='flex flex-wrap gap-2'>
        <a role='tab' href='#clinic' className='rounded-full border px-4 py-2 text-sm font-semibold hover:bg-blue-50'>Clínica</a>
        {sections.map(section=><a key={section.key} role='tab' href={`#${section.key}`} className='rounded-full border px-4 py-2 text-sm font-semibold hover:bg-blue-50'>{section.label}</a>)}
      </div>

      <form id='clinic' action={saveClinicSettings} className='scroll-mt-6 space-y-4 rounded-xl border bg-white p-5 shadow-sm'>
        <div><h2 className='text-xl font-bold'>Configurações da Clínica</h2><p className='text-sm text-gray-500'>O clinic_id não é enviado pelo formulário; ele vem da sessão do usuário logado.</p></div>
        <input type='hidden' name='current_logo_url' value={clinic.logo_url || ''} />
        <div className='grid gap-3 md:grid-cols-3'>
          <label>Nome da clínica<input name='name' defaultValue={clinic.name || ''} required /></label>
          <label>Nome público<input name='public_name' defaultValue={clinic.public_name || ''} /></label>
          <label>CNPJ/CPF<input name='document_number' defaultValue={clinic.document_number || ''} /></label>
          <label>Telefone<input name='phone' defaultValue={clinic.phone || ''} /></label>
          <label>WhatsApp<input name='whatsapp' defaultValue={clinic.whatsapp || ''} /></label>
          <label>E-mail<input name='email' type='email' defaultValue={clinic.email || ''} /></label>
          <label>Cor principal<input name='primary_color' type='color' defaultValue={clinic.primary_color || '#2563eb'} /></label>
          <label>CEP<input name='postal_code' defaultValue={clinic.postal_code || ''} /></label>
          <label>Rua<input name='street' defaultValue={clinic.street || ''} /></label>
          <label>Número<input name='number' defaultValue={clinic.number || ''} /></label>
          <label>Complemento<input name='complement' defaultValue={clinic.complement || ''} /></label>
          <label>Bairro<input name='district' defaultValue={clinic.district || ''} /></label>
          <label>Cidade<input name='city' defaultValue={clinic.city || ''} /></label>
          <label>Estado<input name='state' defaultValue={clinic.state || ''} /></label>
          <label>País<input name='country' defaultValue={clinic.country || 'Brasil'} /></label>
        </div>
        <label className='block'>Descrição curta<textarea name='public_description' rows={4} defaultValue={clinic.public_description || ''} /></label>
        <div className='grid gap-4 md:grid-cols-[220px_1fr]'>
          {clinic.logo_url ? <img src={clinic.logo_url} alt='Logo da clínica' className='h-36 w-full rounded border object-cover'/> : <div className='flex h-36 items-center justify-center rounded border bg-gray-50 text-sm text-gray-500'>Sem logo</div>}
          <div className='space-y-3'>
            <label className='block'>Enviar/substituir logo<input name='logo' type='file' accept='image/jpeg,image/png,image/webp,image/gif' className='mt-1 block w-full'/></label>
            <label className='flex items-center gap-2'><input type='checkbox' name='remove_logo'/>Remover logo atual</label>
            <label className='flex items-center gap-2'><input type='checkbox' name='website_enabled' defaultChecked={clinic.website_enabled} disabled={!hasPublicWebsite}/>Site público ativo {hasPublicWebsite ? '' : '(bloqueado pelo plano)'}</label>
          </div>
        </div>
        <div className='rounded-lg bg-slate-50 p-4 text-sm text-slate-700'>
          <p><strong>Plano atual:</strong> {clinic.plan_code || 'não definido'}</p>
          <p><strong>Status da assinatura:</strong> {statusLabel(clinic.subscription_status)}</p>
          <p><strong>Fim do trial:</strong> {clinic.trial_ends_at ? new Date(clinic.trial_ends_at).toLocaleString('pt-BR') : 'não definido'}</p>
          <p><strong>Domínio principal:</strong> {clinic.primary_domain || 'não definido'}</p>
          <p><strong>Subdomínio padrão:</strong> {clinic.slug}.smilehub.com.br</p>
        </div>
        <SubmitButton label='Salvar configurações da clínica'/>
      </form>

      <div className='space-y-8'>{sections.map(section=>{ const item=content[section.key]; return <form key={section.key} id={section.key} action={saveSettings} className='scroll-mt-6 space-y-4 rounded-xl border bg-white p-5 shadow-sm'><input type='hidden' name='section' value={section.key}/><div><h2 className='text-xl font-bold'>{section.label}</h2><p className='text-sm text-gray-500'>{section.imageLabel}; imagens permitidas: JPG, PNG, WEBP e GIF até 5MB.</p></div><label className='block'>Título<input name='title' type='text' defaultValue={item.title||''} className='mt-1'/></label><label className='block'>Subtítulo<input name='subtitle' type='text' defaultValue={item.subtitle||''} className='mt-1'/></label><label className='block'>Texto<textarea name='body' rows={6} defaultValue={item.body||''} className='mt-1'/></label><div className='grid gap-4 md:grid-cols-[220px_1fr]'>{item.image_url ? <img src={item.image_url} alt={`Preview ${section.label}`} className='h-36 w-full rounded border object-cover'/> : <div className='flex h-36 items-center justify-center rounded border bg-gray-50 text-sm text-gray-500'>Sem imagem</div>}<div className='space-y-3'><label className='block'>Enviar/substituir imagem<input name='image' type='file' accept='image/jpeg,image/png,image/webp,image/gif' className='mt-1 block w-full'/></label><label className='flex items-center gap-2'><input type='checkbox' name='remove_image'/>Remover imagem atual</label><SubmitButton label={`Salvar ${section.label}`}/></div></div></form>})}</div>
    </section>
  )
}
