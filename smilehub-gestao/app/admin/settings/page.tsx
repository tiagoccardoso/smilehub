import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/neon";
import { getSiteContent, type SiteContentSection } from "@/lib/siteContent";
import { requireClinicAccess, statusLabel } from "@/lib/clinic";
import { encryptSecret } from "@/lib/secureCrypto";
import { SubmitButton } from "../_components/submit-button";
import { FormFeedback } from "../_components/form-feedback";
import { ProfileModalButton } from "@/app/components/admin/ProfileModal";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const sections: {
  key: SiteContentSection;
  label: string;
  imageLabel: string;
}[] = [
  {
    key: "home",
    label: "Página Inicial",
    imageLabel: "Banner da página inicial",
  },
  { key: "about", label: "Sobre Nós", imageLabel: "Imagem da seção Sobre Nós" },
  {
    key: "services",
    label: "Serviços",
    imageLabel: "Imagem de destaque dos serviços",
  },
];
const uploadDir = path.join(process.cwd(), "public", "uploads", "site-content");
const publicPrefix = "/uploads/site-content";
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
const maxBytes = 5 * 1024 * 1024;
const certificateMaxBytes = 10 * 1024 * 1024;
const optional = (value: FormDataEntryValue | null) =>
  String(value || "").trim() || null;

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

async function requireSettingsAccess() {
  return requireClinicAccess(["superadmin", "admin"]);
}

async function saveUploadedImage(
  file: FormDataEntryValue | null,
  section: SiteContentSection | "clinic-logo",
) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!allowedTypes.has(file.type)) throw new Error("Tipo de imagem inválido");
  if (file.size > maxBytes) throw new Error("Imagem maior que 5MB");
  await mkdir(uploadDir, { recursive: true });
  const ext = allowedTypes.get(file.type);
  const safeName = `${section}-${Date.now()}-${randomUUID()}.${ext}`;
  const target = path.join(uploadDir, safeName);
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return `${publicPrefix}/${safeName}`;
}

async function removePublicImage(imageUrl: string | null) {
  if (!imageUrl?.startsWith(publicPrefix)) return;
  try {
    await unlink(path.join(process.cwd(), "public", imageUrl));
  } catch {}
}

async function readCertificateFile(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
  const fileName = file.name || "certificado-digital.pfx";
  const lowerName = fileName.toLowerCase();
  if (!lowerName.endsWith(".pfx") && !lowerName.endsWith(".p12"))
    throw new Error("Envie um certificado A1 nos formatos .pfx ou .p12");
  if (file.size > certificateMaxBytes)
    throw new Error("Certificado maior que 10MB");
  return {
    encryptedCertificate: encryptSecret(Buffer.from(await file.arrayBuffer())),
    fileName: fileName.slice(0, 180),
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

async function saveClinicSettings(formData: FormData) {
  "use server";
  const { clinic } = await requireSettingsAccess();
  let target = "/admin/settings";
  try {
    const uploadedLogo = await saveUploadedImage(
      formData.get("logo"),
      "clinic-logo",
    );
    const currentLogo = optional(formData.get("current_logo_url"));
    const removeLogo = formData.get("remove_logo") === "on";
    const logoUrl = removeLogo ? null : uploadedLogo || currentLogo;

    await sql`
      update clinics
         set name = ${optional(formData.get("name")) || clinic.name},
             public_name = ${optional(formData.get("public_name"))},
             document_number = ${optional(formData.get("document_number"))},
             phone = ${optional(formData.get("phone"))},
             whatsapp = ${optional(formData.get("whatsapp"))},
             email = ${optional(formData.get("email"))},
             logo_url = ${logoUrl},
             primary_color = ${optional(formData.get("primary_color")) || "#2563eb"},
             public_description = ${optional(formData.get("public_description"))},
             postal_code = ${optional(formData.get("postal_code"))},
             street = ${optional(formData.get("street"))},
             number = ${optional(formData.get("number"))},
             complement = ${optional(formData.get("complement"))},
             district = ${optional(formData.get("district"))},
             city = ${optional(formData.get("city"))},
             state = ${optional(formData.get("state"))},
             country = ${optional(formData.get("country")) || "Brasil"},
             website_enabled = case
               when exists (
                 select 1 from clinic_entitlements
                  where clinic_id = ${clinic.id}::uuid and feature_code = 'public_website' and enabled = true
               ) then ${formData.get("website_enabled") === "on"}
               else false
             end
       where id = ${clinic.id}::uuid
    `;

    if (
      (uploadedLogo || removeLogo) &&
      clinic.logo_url &&
      clinic.logo_url !== logoUrl
    )
      await removePublicImage(clinic.logo_url);
    target += "?ok=Configura%C3%A7%C3%B5es+da+cl%C3%ADnica+salvas+com+sucesso";
  } catch (error) {
    console.error("clinic-settings.save");
    target +=
      "?error=N%C3%A3o+foi+poss%C3%ADvel+salvar+as+configura%C3%A7%C3%B5es+da+cl%C3%ADnica";
  }
  revalidatePath("/admin/settings");
  redirect(`${target}#clinic`);
}

async function saveNfseCertificate(formData: FormData) {
  "use server";
  const { clinic, admin } = await requireSettingsAccess();
  let target = "/admin/settings";

  try {
    const certificateType = String(
      formData.get("certificate_type") || "e_cnpj",
    );
    if (!["e_cnpj", "e_cpf"].includes(certificateType))
      throw new Error("Tipo de certificado inválido");

    const providerName = optional(formData.get("provider_name"));
    const environment =
      String(formData.get("environment") || "homologation") === "production"
        ? "production"
        : "homologation";
    const documentNumber = optional(formData.get("document_number"));
    const cityCode = optional(formData.get("city_code"));
    const municipalRegistration = optional(
      formData.get("municipal_registration"),
    );
    const validUntil = optional(formData.get("valid_until"));
    const password = String(formData.get("certificate_password") || "");
    const removeCertificate = formData.get("remove_certificate") === "on";
    const uploaded = await readCertificateFile(
      formData.get("certificate_file"),
    );

    const currentRows = await sql`
      select encrypted_certificate, encrypted_password, file_name, mime_type, size_bytes
        from nfse_certificate_settings
       where clinic_id = ${clinic.id}::uuid
       limit 1
    `;
    const current = (currentRows as any[])[0] || {};

    if (uploaded && !password && !current.encrypted_password)
      throw new Error("Informe a senha do certificado");

    const encryptedCertificate = removeCertificate
      ? null
      : uploaded?.encryptedCertificate || current.encrypted_certificate || null;
    const encryptedPassword = removeCertificate
      ? null
      : password
        ? encryptSecret(password)
        : current.encrypted_password || null;
    const fileName = removeCertificate
      ? null
      : uploaded?.fileName || current.file_name || null;
    const mimeType = removeCertificate
      ? null
      : uploaded?.mimeType || current.mime_type || null;
    const sizeBytes = removeCertificate
      ? null
      : uploaded?.sizeBytes || current.size_bytes || null;
    const status = encryptedCertificate ? "configured" : "not_configured";

    await sql`
      insert into nfse_certificate_settings (
        clinic_id, certificate_type, document_number, provider_name, environment,
        city_code, municipal_registration, file_name, mime_type, size_bytes,
        encrypted_certificate, encrypted_password, has_password, valid_until, status, updated_by
      ) values (
        ${clinic.id}::uuid, ${certificateType}, ${documentNumber}, ${providerName}, ${environment},
        ${cityCode}, ${municipalRegistration}, ${fileName}, ${mimeType}, ${sizeBytes},
        ${encryptedCertificate}, ${encryptedPassword}, ${Boolean(encryptedPassword)}, ${validUntil}, ${status}, ${admin.profile.id}::uuid
      )
      on conflict (clinic_id) do update set
        certificate_type = excluded.certificate_type,
        document_number = excluded.document_number,
        provider_name = excluded.provider_name,
        environment = excluded.environment,
        city_code = excluded.city_code,
        municipal_registration = excluded.municipal_registration,
        file_name = excluded.file_name,
        mime_type = excluded.mime_type,
        size_bytes = excluded.size_bytes,
        encrypted_certificate = excluded.encrypted_certificate,
        encrypted_password = excluded.encrypted_password,
        has_password = excluded.has_password,
        valid_until = excluded.valid_until,
        status = excluded.status,
        updated_by = excluded.updated_by,
        updated_at = now()
    `;

    target += removeCertificate
      ? "?ok=Certificado+digital+removido+com+sucesso"
      : "?ok=Configura%C3%A7%C3%A3o+do+certificado+digital+salva+com+sucesso";
  } catch (error: any) {
    console.error("nfse-certificate.save");
    const message = String(error?.message || "");
    const safeMessages = [
      "Envie um certificado",
      "Certificado maior",
      "Informe a senha",
      "Chave de criptografia ausente",
      "Tipo de certificado",
    ];
    const safeMessage = safeMessages.some((item) => message.startsWith(item))
      ? message
      : "Não foi possível salvar o certificado digital.";
    target += `?error=${encodeURIComponent(safeMessage).replace(/%20/g, "+")}`;
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/financial");
  redirect(`${target}#nfse-certificate`);
}


async function saveDeepSeekSettings(formData: FormData) {
  "use server";
  const { clinic, admin } = await requireSettingsAccess();
  let target = "/admin/settings";

  try {
    const rawToken = String(formData.get("deepseek_api_key") || "").trim();
    const removeToken = formData.get("remove_deepseek_token") === "on";
    const model = String(formData.get("deepseek_model") || "deepseek-v4-flash");
    const safeModel = ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat"].includes(model)
      ? model
      : "deepseek-v4-flash";

    const currentRows = await sql`
      select encrypted_api_key
        from clinic_ai_settings
       where clinic_id = ${clinic.id}::uuid and provider = 'deepseek'
       limit 1
    `;
    const current = (currentRows as any[])[0] || {};

    const encryptedToken = removeToken
      ? null
      : rawToken
        ? encryptSecret(rawToken)
        : current.encrypted_api_key || null;
    const status = encryptedToken ? "configured" : "not_configured";

    await sql`
      insert into clinic_ai_settings (clinic_id, provider, model, encrypted_api_key, status, updated_by)
      values (${clinic.id}::uuid, 'deepseek', ${safeModel}, ${encryptedToken}, ${status}, ${admin.profile.id}::uuid)
      on conflict (clinic_id, provider) do update set
        model = excluded.model,
        encrypted_api_key = excluded.encrypted_api_key,
        status = excluded.status,
        updated_by = excluded.updated_by,
        updated_at = now()
    `;

    target += removeToken
      ? "?ok=Token+DeepSeek+removido+com+sucesso"
      : encryptedToken
        ? "?ok=Configura%C3%A7%C3%A3o+DeepSeek+salva+com+sucesso"
        : "?error=Informe+um+token+DeepSeek+ou+marque+a+op%C3%A7%C3%A3o+de+remover";
  } catch (error: any) {
    console.error("deepseek-settings.save");
    const message = String(error?.message || "");
    const safeMessage = message.startsWith("Chave de criptografia ausente")
      ? "Chave de criptografia ausente no servidor. Configure NEON_AUTH_COOKIE_SECRET ou NFSE_CERTIFICATE_ENCRYPTION_KEY."
      : "Não foi possível salvar a configuração da DeepSeek.";
    target += `?error=${encodeURIComponent(safeMessage).replace(/%20/g, "+")}`;
  }

  revalidatePath("/admin/settings");
  redirect(`${target}#deepseek-ai`);
}

async function saveSettings(formData: FormData) {
  "use server";
  const { clinic } = await requireSettingsAccess();
  const section = String(formData.get("section") || "") as SiteContentSection;
  let target = "/admin/settings";
  try {
    if (!sections.some((item) => item.key === section))
      throw new Error("Seção inválida");
    const current =
      await sql`select image_url from site_content_settings where clinic_id = ${clinic.id}::uuid and section = ${section} limit 1`;
    const currentImage = (current as any[])[0]?.image_url || null;
    const uploadedImage = await saveUploadedImage(
      formData.get("image"),
      section,
    );
    const removeImage = formData.get("remove_image") === "on";
    const imageUrl = removeImage ? null : uploadedImage || currentImage;

    await sql`
      insert into site_content_settings (clinic_id, section, title, subtitle, body, image_url, extra)
      values (${clinic.id}::uuid, ${section}, ${optional(formData.get("title"))}, ${optional(formData.get("subtitle"))}, ${optional(formData.get("body"))}, ${imageUrl}, '{}'::jsonb)
      on conflict (clinic_id, section) do update set title = excluded.title, subtitle = excluded.subtitle, body = excluded.body, image_url = excluded.image_url, updated_at = now()
    `;
    if (
      (uploadedImage || removeImage) &&
      currentImage &&
      currentImage !== imageUrl
    )
      await removePublicImage(currentImage);
    target += "?ok=Configura%C3%A7%C3%B5es+salvas+com+sucesso";
  } catch (error) {
    console.error("settings.save");
    target += "?error=N%C3%A3o+foi+poss%C3%ADvel+salvar.+Valide+texto+e+imagem";
  }
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/services");
  redirect(`${target}#${section}`);
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>;
}) {
  const { clinic } = await requireSettingsAccess();
  const params = (await searchParams) ?? {};
  const content = await getSiteContent(clinic.id);
  const canEnablePublicWebsite =
    await sql`select 1 from clinic_entitlements where clinic_id = ${clinic.id}::uuid and feature_code = 'public_website' and enabled = true limit 1`;
  const hasPublicWebsite = (canEnablePublicWebsite as unknown[]).length > 0;

  let nfseCertificate: any | null = null;
  try {
    const certificateRows = await sql`
      select certificate_type, document_number, provider_name, environment, city_code, municipal_registration,
             file_name, mime_type, size_bytes, has_password, valid_until, status, updated_at
        from nfse_certificate_settings
       where clinic_id = ${clinic.id}::uuid
       limit 1
    `;
    nfseCertificate = (certificateRows as any[])[0] ?? null;
  } catch {
    nfseCertificate = null;
  }

  let deepseekSettings: any | null = null;
  try {
    const deepseekRows = await sql`
      select provider, model, status, updated_at
        from clinic_ai_settings
       where clinic_id = ${clinic.id}::uuid and provider = 'deepseek'
       limit 1
    `;
    deepseekSettings = (deepseekRows as any[])[0] ?? null;
  } catch {
    deepseekSettings = null;
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Configurações
        </p>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-gray-600">
          Gerencie dados da clínica, conteúdo público, perfil, certificado
          digital fiscal e integração com IA.
        </p>
      </div>
      <FormFeedback ok={params.ok} error={params.error} />
      <div
        role="tablist"
        aria-label="Abas de configurações"
        className="flex flex-wrap gap-2"
      >
        <a
          role="tab"
          href="#clinic"
          className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-blue-50"
        >
          Clínica
        </a>
        <a
          role="tab"
          href="#nfse-certificate"
          className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-blue-50"
        >
          Certificado NFS-e
        </a>
        <a
          role="tab"
          href="#deepseek-ai"
          className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-blue-50"
        >
          IA DeepSeek
        </a>
        <a
          role="tab"
          href="#profile"
          className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-blue-50"
        >
          Perfil do usuário
        </a>
        {sections.map((section) => (
          <a
            key={section.key}
            role="tab"
            href={`#${section.key}`}
            className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-blue-50"
          >
            {section.label}
          </a>
        ))}
      </div>

      <div
        id="profile"
        className="scroll-mt-6 rounded-xl border bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Perfil do usuário</h2>
            <p className="text-sm text-gray-500">
              Edite nome, e-mail, telefone, senha e avatar do usuário logado. A
              sessão é atualizada após salvar.
            </p>
          </div>
          <ProfileModalButton
            label="Editar meu perfil"
            buttonClassName="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-blue-50"
          />
        </div>
      </div>

      <form
        id="clinic"
        action={saveClinicSettings}
        className="scroll-mt-6 space-y-4 rounded-xl border bg-white p-5 shadow-sm"
      >
        <div>
          <h2 className="text-xl font-bold">Configurações da Clínica</h2>
          <p className="text-sm text-gray-500">
            O clinic_id não é enviado pelo formulário; ele vem da sessão do
            usuário logado.
          </p>
        </div>
        <input
          type="hidden"
          name="current_logo_url"
          value={clinic.logo_url || ""}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <label>
            Nome da clínica
            <input name="name" defaultValue={clinic.name || ""} required />
          </label>
          <label>
            Nome público
            <input name="public_name" defaultValue={clinic.public_name || ""} />
          </label>
          <label>
            CNPJ/CPF
            <input
              name="document_number"
              defaultValue={clinic.document_number || ""}
            />
          </label>
          <label>
            Telefone
            <input name="phone" defaultValue={clinic.phone || ""} />
          </label>
          <label>
            WhatsApp
            <input name="whatsapp" defaultValue={clinic.whatsapp || ""} />
          </label>
          <label>
            E-mail
            <input
              name="email"
              type="email"
              defaultValue={clinic.email || ""}
            />
          </label>
          <label>
            Cor principal
            <input
              name="primary_color"
              type="color"
              defaultValue={clinic.primary_color || "#2563eb"}
            />
          </label>
          <label>
            CEP
            <input name="postal_code" defaultValue={clinic.postal_code || ""} />
          </label>
          <label>
            Rua
            <input name="street" defaultValue={clinic.street || ""} />
          </label>
          <label>
            Número
            <input name="number" defaultValue={clinic.number || ""} />
          </label>
          <label>
            Complemento
            <input name="complement" defaultValue={clinic.complement || ""} />
          </label>
          <label>
            Bairro
            <input name="district" defaultValue={clinic.district || ""} />
          </label>
          <label>
            Cidade
            <input name="city" defaultValue={clinic.city || ""} />
          </label>
          <label>
            Estado
            <input name="state" defaultValue={clinic.state || ""} />
          </label>
          <label>
            País
            <input name="country" defaultValue={clinic.country || "Brasil"} />
          </label>
        </div>
        <label className="block">
          Descrição curta
          <textarea
            name="public_description"
            rows={4}
            defaultValue={clinic.public_description || ""}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          {clinic.logo_url ? (
            <img
              src={clinic.logo_url}
              alt="Logo da clínica"
              className="h-36 w-full rounded border object-cover"
            />
          ) : (
            <div className="flex h-36 items-center justify-center rounded border bg-gray-50 text-sm text-gray-500">
              Sem logo
            </div>
          )}
          <div className="space-y-3">
            <label className="block">
              Enviar/substituir logo
              <input
                name="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="mt-1 block w-full"
              />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="remove_logo" />
              Remover logo atual
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="website_enabled"
                defaultChecked={clinic.website_enabled}
                disabled={!hasPublicWebsite}
              />
              Site público ativo{" "}
              {hasPublicWebsite ? "" : "(bloqueado pelo plano)"}
            </label>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            <strong>Plano atual:</strong> {clinic.plan_code || "não definido"}
          </p>
          <p>
            <strong>Status da assinatura:</strong>{" "}
            {statusLabel(clinic.subscription_status)}
          </p>
          <p>
            <strong>Fim do trial:</strong>{" "}
            {clinic.trial_ends_at
              ? new Date(clinic.trial_ends_at).toLocaleString("pt-BR")
              : "não definido"}
          </p>
          <p>
            <strong>Domínio principal:</strong>{" "}
            {clinic.primary_domain || "não definido"}
          </p>
          <p>
            <strong>Subdomínio padrão:</strong> {clinic.slug}.smilehub.com.br
          </p>
        </div>
        <SubmitButton label="Salvar configurações da clínica" />
      </form>

      <form
        id="nfse-certificate"
        action={saveNfseCertificate}
        className="scroll-mt-6 space-y-4 rounded-xl border bg-white p-5 shadow-sm"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Nota Fiscal de Serviço Eletrônica
          </p>
          <h2 className="text-xl font-bold">Certificado Digital para NFS-e</h2>
          <p className="text-sm text-gray-500">
            Cadastre o certificado A1 e-CNPJ ou e-CPF usado na emissão fiscal. O
            arquivo e a senha são criptografados no servidor e não são exibidos
            após salvar.
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            <strong>Status:</strong>{" "}
            {nfseCertificate?.status === "configured"
              ? "Configurado"
              : "Não configurado"}
          </p>
          <p>
            <strong>Arquivo atual:</strong>{" "}
            {nfseCertificate?.file_name || "nenhum certificado enviado"}
          </p>
          <p>
            <strong>Senha:</strong>{" "}
            {nfseCertificate?.has_password
              ? "cadastrada e protegida"
              : "não cadastrada"}
          </p>
          <p>
            <strong>Última atualização:</strong>{" "}
            {nfseCertificate?.updated_at
              ? new Date(nfseCertificate.updated_at).toLocaleString("pt-BR")
              : "não informado"}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label>
            Tipo de certificado
            <select
              name="certificate_type"
              defaultValue={nfseCertificate?.certificate_type || "e_cnpj"}
            >
              <option value="e_cnpj">e-CNPJ</option>
              <option value="e_cpf">e-CPF</option>
            </select>
          </label>
          <label>
            CNPJ/CPF do certificado
            <input
              name="document_number"
              defaultValue={
                nfseCertificate?.document_number || clinic.document_number || ""
              }
              placeholder="Documento vinculado ao certificado"
            />
          </label>
          <label>
            Ambiente
            <select
              name="environment"
              defaultValue={nfseCertificate?.environment || "homologation"}
            >
              <option value="homologation">Homologação</option>
              <option value="production">Produção</option>
            </select>
          </label>
          <label>
            Prefeitura/provedor
            <input
              name="provider_name"
              defaultValue={nfseCertificate?.provider_name || ""}
              placeholder="Nome do provedor ou prefeitura"
            />
          </label>
          <label>
            Código IBGE do município
            <input
              name="city_code"
              defaultValue={nfseCertificate?.city_code || ""}
              placeholder="Ex.: 4105508"
            />
          </label>
          <label>
            Inscrição municipal
            <input
              name="municipal_registration"
              defaultValue={nfseCertificate?.municipal_registration || ""}
            />
          </label>
          <label>
            Validade do certificado
            <input
              name="valid_until"
              type="date"
              defaultValue={toDateInputValue(nfseCertificate?.valid_until)}
            />
          </label>
          <label>
            Arquivo do certificado A1
            <input
              name="certificate_file"
              type="file"
              accept=".pfx,.p12,application/x-pkcs12,application/pkcs12,application/octet-stream"
            />
          </label>
          <label>
            Senha do certificado
            <input
              name="certificate_password"
              type="password"
              autoComplete="new-password"
              placeholder={
                nfseCertificate?.has_password
                  ? "Deixe em branco para manter a atual"
                  : "Senha do PFX/P12"
              }
            />
          </label>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p>
            Não salve certificados em pastas públicas, localStorage ou logs.
            Para produção, mantenha{" "}
            <strong>NFSE_CERTIFICATE_ENCRYPTION_KEY</strong> configurada no
            ambiente e valide o provedor municipal antes de emitir notas reais.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remove_certificate" />
          Remover arquivo e senha do certificado atual
        </label>
        <SubmitButton label="Salvar certificado digital" />
      </form>

      <form
        id="deepseek-ai"
        action={saveDeepSeekSettings}
        className="scroll-mt-6 space-y-4 rounded-xl border bg-white p-5 shadow-sm"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Inteligência artificial
          </p>
          <h2 className="text-xl font-bold">IA DeepSeek</h2>
          <p className="text-sm text-gray-500">
            Configure o token usado pelo assistente do odontograma para sugerir textos do termo de responsabilidade. O token é criptografado no servidor e nunca é exibido após salvar.
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            <strong>Status:</strong>{" "}
            {deepseekSettings?.status === "configured" ? "Configurado" : "Não configurado"}
          </p>
          <p>
            <strong>Modelo:</strong>{" "}
            {deepseekSettings?.model || "deepseek-v4-flash"}
          </p>
          <p>
            <strong>Última atualização:</strong>{" "}
            {deepseekSettings?.updated_at
              ? new Date(deepseekSettings.updated_at).toLocaleString("pt-BR")
              : "não informado"}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label>
            Modelo DeepSeek
            <select
              name="deepseek_model"
              defaultValue={deepseekSettings?.model || "deepseek-v4-flash"}
            >
              <option value="deepseek-v4-flash">deepseek-v4-flash</option>
              <option value="deepseek-v4-pro">deepseek-v4-pro</option>
              <option value="deepseek-chat">deepseek-chat (compatibilidade)</option>
            </select>
          </label>
          <label>
            Token/API Key da DeepSeek
            <input
              name="deepseek_api_key"
              type="password"
              autoComplete="new-password"
              placeholder={
                deepseekSettings?.status === "configured"
                  ? "Deixe em branco para manter o token atual"
                  : "Cole o token da DeepSeek"
              }
            />
          </label>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
          <p>
            O token é usado apenas em chamadas server-side para a DeepSeek. Não salve chaves em arquivos públicos, console, localStorage ou código versionado.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remove_deepseek_token" />
          Remover token DeepSeek atual
        </label>
        <SubmitButton label="Salvar configuração DeepSeek" />
      </form>

      <div className="space-y-8">
        {sections.map((section) => {
          const item = content[section.key];
          return (
            <form
              key={section.key}
              id={section.key}
              action={saveSettings}
              className="scroll-mt-6 space-y-4 rounded-xl border bg-white p-5 shadow-sm"
            >
              <input type="hidden" name="section" value={section.key} />
              <div>
                <h2 className="text-xl font-bold">{section.label}</h2>
                <p className="text-sm text-gray-500">
                  {section.imageLabel}; imagens permitidas: JPG, PNG, WEBP e GIF
                  até 5MB.
                </p>
              </div>
              <label className="block">
                Título
                <input
                  name="title"
                  type="text"
                  defaultValue={item.title || ""}
                  className="mt-1"
                />
              </label>
              <label className="block">
                Subtítulo
                <input
                  name="subtitle"
                  type="text"
                  defaultValue={item.subtitle || ""}
                  className="mt-1"
                />
              </label>
              <label className="block">
                Texto
                <textarea
                  name="body"
                  rows={6}
                  defaultValue={item.body || ""}
                  className="mt-1"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={`Preview ${section.label}`}
                    className="h-36 w-full rounded border object-cover"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center rounded border bg-gray-50 text-sm text-gray-500">
                    Sem imagem
                  </div>
                )}
                <div className="space-y-3">
                  <label className="block">
                    Enviar/substituir imagem
                    <input
                      name="image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="mt-1 block w-full"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="remove_image" />
                    Remover imagem atual
                  </label>
                  <SubmitButton label={`Salvar ${section.label}`} />
                </div>
              </div>
            </form>
          );
        })}
      </div>
    </section>
  );
}
