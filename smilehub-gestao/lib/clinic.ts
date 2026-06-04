import { redirect } from "next/navigation";
import { getCurrentAdminProfile } from "@/lib/auth";
import { sql } from "@/lib/neon";
import type { AdminRole } from "@/lib/types";
import { getSubscriptionAccess } from "@/lib/subscription";
import {
  getDefaultPublicSiteDomain,
  normalizeDomain,
  slugifyClinicName,
} from "@/lib/clinicUtils";

export const patientStatus = ["active", "inactive"] as const;
export const appointmentStatus = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "canceled",
  "no_show",
] as const;
export const budgetStatus = [
  "draft",
  "sent",
  "approved",
  "rejected",
  "canceled",
] as const;
export const financeStatus = [
  "pending",
  "paid",
  "overdue",
  "canceled",
] as const;

export const statusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em andamento",
  completed: "Concluído",
  canceled: "Cancelado",
  no_show: "Não compareceu",
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Rejeitado",
  pending: "Pendente",
  paid: "Pago",
  overdue: "Vencido",
  trialing: "Em teste",
  past_due: "Pagamento pendente",
  configuration_required: "Configuração necessária",
  processing: "Processando",
  issued: "Emitida",
  failed: "Falhou",
  not_configured: "Não configurado",
  configured: "Configurado",
  expired: "Expirado",
};

export function statusLabel(status?: string | null) {
  if (!status) return "Não definido";
  return statusLabels[status] ?? status;
}

export type ClinicRow = {
  id: string;
  name: string;
  slug: string;
  public_name: string | null;
  document_number: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  logo_url: string | null;
  primary_color: string | null;
  public_description: string | null;
  postal_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  status: string;
  website_enabled: boolean;
  management_enabled: boolean;
  plan_code?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
  primary_domain?: string | null;
  created_at?: string;
  updated_at?: string;
};

export { getDefaultPublicSiteDomain, normalizeDomain, slugifyClinicName };

export async function getCurrentClinic(): Promise<ClinicRow | null> {
  const admin = await getCurrentAdminProfile();
  if (!admin) return null;

  const rows = await sql`
    select c.*,
           cu.role as clinic_role,
           cu.is_owner,
           cs.plan_code,
           cs.status as subscription_status,
           cs.trial_ends_at,
           cs.current_period_ends_at,
           cd.domain as primary_domain
      from clinic_users cu
      join clinics c on c.id = cu.clinic_id
      left join lateral (
        select plan_code, status, trial_ends_at, current_period_ends_at
          from clinic_subscriptions
         where clinic_id = c.id
         order by created_at desc
         limit 1
      ) cs on true
      left join lateral (
        select domain
          from clinic_domains
         where clinic_id = c.id and is_primary = true
         order by created_at asc
         limit 1
      ) cd on true
     where cu.user_id = ${admin.profile.id}::uuid
       and c.status in ('active','trialing')
     order by cu.is_owner desc, cu.created_at asc
     limit 1
  `;

  return (rows as ClinicRow[])[0] ?? null;
}

export async function requireCurrentClinic(): Promise<ClinicRow> {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/admin?error=Clinica+nao+vinculada");
  const access = getSubscriptionAccess({
    id: '',
    clinic_id: clinic.id,
    plan_code: clinic.plan_code || 'gestao',
    status: clinic.subscription_status || 'incomplete',
    trial_ends_at: clinic.trial_ends_at,
    current_period_ends_at: clinic.current_period_ends_at,
  });
  if (!access.hasAccess) redirect(`/admin/subscriptions?bloqueado=1&motivo=${access.reason}`);
  return clinic as ClinicRow;
}

export async function getCurrentUserClinicRole() {
  const admin = await getCurrentAdminProfile();
  if (!admin) return null;

  const rows = await sql`
    select cu.role, cu.is_owner, cu.clinic_id
      from clinic_users cu
     where cu.user_id = ${admin.profile.id}::uuid
     order by cu.is_owner desc, cu.created_at asc
     limit 1
  `;

  return (
    (rows as { role: AdminRole; is_owner: boolean; clinic_id: string }[])[0] ??
    null
  );
}

export async function requireClinicAccess(
  allowedRoles?: AdminRole[],
): Promise<{
  admin: NonNullable<Awaited<ReturnType<typeof getCurrentAdminProfile>>>;
  clinic: ClinicRow;
}> {
  const admin = await getCurrentAdminProfile();
  if (!admin) redirect("/admin");
  const clinic = await requireCurrentClinic();
  if (allowedRoles?.length && !allowedRoles.includes(admin.role))
    redirect("/admin/dashboard");
  return { admin, clinic };
}

export async function listLookup() {
  const clinic = await requireCurrentClinic();
  const [patients, professionals, procedures, budgets] = await Promise.all([
    sql`select id, full_name from patients where clinic_id = ${clinic.id}::uuid order by full_name`,
    sql`select id, full_name from professionals where clinic_id = ${clinic.id}::uuid and is_active = true order by full_name`,
    sql`select id, name from procedures where clinic_id = ${clinic.id}::uuid and is_active = true order by name`,
    sql`select id from budgets where clinic_id = ${clinic.id}::uuid order by created_at desc limit 200`,
  ]);
  return {
    patients: patients as any[],
    professionals: professionals as any[],
    procedures: procedures as any[],
    budgets: budgets as any[],
  };
}
