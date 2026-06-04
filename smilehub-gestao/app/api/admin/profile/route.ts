import {
  authenticate,
  getCurrentAdminProfile,
  setSession,
  updateUserPassword,
} from "@/lib/auth";
import { requireClinicAccess } from "@/lib/clinic";
import { removePublicImage, savePublicImage } from "@/lib/imageUpload";
import { sql } from "@/lib/neon";

const optional = (value: FormDataEntryValue | null) =>
  String(value || "").trim() || null;
const normalizeEmail = (value: FormDataEntryValue | null) =>
  String(value || "")
    .trim()
    .toLowerCase();

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET() {
  const { admin } = await requireClinicAccess();
  const rows = await sql`
    select id, name, email, role, phone, avatar_url, created_at, updated_at
      from public."user"
     where id = ${admin.profile.id}::uuid
     limit 1
  `;
  const profile = (rows as any[])[0];
  if (!profile)
    return Response.json({ message: "Perfil não encontrado" }, { status: 404 });
  return Response.json({ profile });
}

export async function PATCH(req: Request) {
  try {
    const current = await getCurrentAdminProfile();
    if (!current)
      return Response.json({ message: "Não autorizado" }, { status: 401 });
    await requireClinicAccess();

    const formData = await req.formData();
    const name = optional(formData.get("name"));
    const email = normalizeEmail(formData.get("email"));
    const phone = optional(formData.get("phone"));
    const currentPassword = String(formData.get("current_password") || "");
    const newPassword = String(formData.get("new_password") || "");
    const confirmPassword = String(formData.get("confirm_password") || "");
    const removeAvatar = formData.get("remove_avatar") === "on";

    if (!name)
      return Response.json(
        { message: "Informe o nome do usuário." },
        { status: 400 },
      );
    if (!email || !isValidEmail(email))
      return Response.json(
        { message: "Informe um e-mail válido." },
        { status: 400 },
      );

    const currentRows = await sql`
      select id, name, email, role, phone, avatar_url
        from public."user"
       where id = ${current.profile.id}::uuid
       limit 1
    `;
    const currentProfile = (currentRows as any[])[0];
    if (!currentProfile)
      return Response.json(
        { message: "Perfil não encontrado" },
        { status: 404 },
      );

    const emailChanged =
      email !== String(currentProfile.email || "").toLowerCase();
    const passwordChanged = Boolean(newPassword || confirmPassword);

    if (emailChanged) {
      const duplicateRows = await sql`
        select id from public."user"
         where lower(email) = ${email} and id <> ${current.profile.id}::uuid
         limit 1
      `;
      if ((duplicateRows as any[]).length) {
        return Response.json(
          { message: "Este e-mail já está em uso por outro usuário." },
          { status: 409 },
        );
      }
    }

    if (passwordChanged) {
      if (!currentPassword)
        return Response.json(
          { message: "Informe a senha atual para alterar a senha." },
          { status: 400 },
        );
      if (newPassword.length < 8)
        return Response.json(
          { message: "A nova senha deve ter pelo menos 8 caracteres." },
          { status: 400 },
        );
      if (newPassword !== confirmPassword)
        return Response.json(
          { message: "A confirmação da nova senha não confere." },
          { status: 400 },
        );
      const authenticated = await authenticate(
        String(currentProfile.email || "").toLowerCase(),
        currentPassword,
      );
      if (!authenticated || authenticated.id !== current.profile.id) {
        return Response.json(
          { message: "Senha atual inválida." },
          { status: 400 },
        );
      }
    }

    const currentAvatar = currentProfile.avatar_url || null;
    const uploadedAvatar = await savePublicImage(
      formData.get("avatar"),
      "user-avatar",
    );
    const avatarUrl = removeAvatar ? null : uploadedAvatar || currentAvatar;

    const rows = await sql`
      update public."user"
         set name = ${name},
             email = ${email},
             phone = ${phone},
             avatar_url = ${avatarUrl},
             updated_at = now()
       where id = ${current.profile.id}::uuid
       returning id, name, email, role, phone, avatar_url, created_at, updated_at
    `;
    const profile = (rows as any[])[0];
    if (!profile)
      return Response.json(
        { message: "Perfil não encontrado" },
        { status: 404 },
      );

    await sql`
      update public.users
         set email = ${email},
             name = ${name},
             updated_at = now()
       where id = ${current.profile.id}::uuid
    `;

    if (passwordChanged)
      await updateUserPassword(current.profile.id, newPassword);
    if (
      (uploadedAvatar || removeAvatar) &&
      currentAvatar &&
      currentAvatar !== avatarUrl
    )
      await removePublicImage(currentAvatar);

    await setSession({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
    });
    return Response.json({ message: "Perfil atualizado", profile });
  } catch (error: any) {
    console.error("profile.patch");
    const message = String(error?.message || "");
    const safeMessage =
      message.startsWith("Tipo de imagem") || message.startsWith("Imagem maior")
        ? message
        : "Não foi possível atualizar o perfil.";
    return Response.json({ message: safeMessage }, { status: 400 });
  }
}
