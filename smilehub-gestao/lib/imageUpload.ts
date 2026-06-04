import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
])

export const publicUploadPrefix = '/uploads/site-content'
export const maxImageUploadBytes = 5 * 1024 * 1024

function safeSection(value: string) {
  return value.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
}

export async function savePublicImage(file: FormDataEntryValue | null, section = 'image') {
  if (!(file instanceof File) || file.size === 0) return null
  if (!allowedTypes.has(file.type)) throw new Error('Tipo de imagem inválido. Envie JPG, PNG, WEBP ou GIF.')
  if (file.size > maxImageUploadBytes) throw new Error('Imagem maior que 5MB.')

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'site-content')
  await mkdir(uploadDir, { recursive: true })
  const ext = allowedTypes.get(file.type)
  const safeName = `${safeSection(section)}-${Date.now()}-${randomUUID()}.${ext}`
  const target = path.join(uploadDir, safeName)
  await writeFile(target, Buffer.from(await file.arrayBuffer()))
  return `${publicUploadPrefix}/${safeName}`
}

export async function removePublicImage(imageUrl: string | null | undefined) {
  if (!imageUrl?.startsWith(publicUploadPrefix)) return
  try {
    await unlink(path.join(process.cwd(), 'public', imageUrl))
  } catch {}
}
