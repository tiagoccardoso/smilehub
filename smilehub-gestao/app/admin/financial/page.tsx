import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/neon";
import { financeStatus, requireClinicAccess, statusLabel } from "@/lib/clinic";
import { issueNfse } from "@/lib/nfse";
import { SubmitButton } from "../_components/submit-button";
import { FormFeedback } from "../_components/form-feedback";
import { DeleteConfirmButton } from "../_components/delete-confirm-button";
import { AdminIcon } from "@/app/components/admin/AdminIcon";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const parseMoney = (value: string) =>
  Number(value.replace(/\./g, "").replace(",", ".")) || 0;
const optional = (value: FormDataEntryValue | null) =>
  String(value || "").trim() || null;

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  if (value instanceof Date) return value.toLocaleDateString("pt-BR");
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

async function save(formData: FormData) {
  "use server";

  const { clinic } = await requireClinicAccess([
    "superadmin",
    "admin",
    "financial",
  ]);
  const id = optional(formData.get("id"));
  const patient = optional(formData.get("patient_id"));
  const description = optional(formData.get("description"));
  let target = "/admin/financial";

  try {
    if (!patient || !description) {
      target += "?error=Informe+paciente+e+descri%C3%A7%C3%A3o";
    } else if (id) {
      const updated = await sql`
        update financial_entries
           set patient_id = ${patient}::uuid,
               budget_id = ${optional(formData.get("budget_id"))}::uuid,
               description = ${description},
               payment_method = ${optional(formData.get("payment_method"))},
               due_date = ${optional(formData.get("due_date"))},
               amount = ${parseMoney(String(formData.get("amount") || "0"))},
               status = ${String(formData.get("status") || "pending")}::finance_status
         where id = ${id}::uuid and clinic_id = ${clinic.id}::uuid
         returning id
      `;
      target += (updated as unknown[]).length
        ? "?ok=Registro+financeiro+atualizado+com+sucesso"
        : "?error=Registro+n%C3%A3o+encontrado";
    } else {
      await sql`
        insert into financial_entries (clinic_id, patient_id, budget_id, description, payment_method, due_date, amount, status)
        values (${clinic.id}::uuid, ${patient}::uuid, ${optional(formData.get("budget_id"))}::uuid, ${description}, ${optional(formData.get("payment_method"))}, ${optional(formData.get("due_date"))}, ${parseMoney(String(formData.get("amount") || "0"))}, ${String(formData.get("status") || "pending")}::finance_status)
      `;
      target += "?ok=Registro+financeiro+cadastrado+com+sucesso";
    }
  } catch (error) {
    console.error("financial.save", error);
    target += "?error=N%C3%A3o+foi+poss%C3%ADvel+salvar+o+registro";
  }

  revalidatePath("/admin/financial");
  redirect(target);
}

async function remove(formData: FormData) {
  "use server";

  const { clinic } = await requireClinicAccess([
    "superadmin",
    "admin",
    "financial",
  ]);
  let target = "/admin/financial";

  try {
    const id = optional(formData.get("id"));
    const deleted = id
      ? await sql`delete from financial_entries where id = ${id}::uuid and clinic_id = ${clinic.id}::uuid returning id`
      : [];
    target += (deleted as unknown[]).length
      ? "?ok=Registro+financeiro+exclu%C3%ADdo+com+sucesso"
      : "?error=Registro+n%C3%A3o+encontrado";
  } catch (error) {
    console.error("financial.delete", error);
    target += "?error=N%C3%A3o+foi+poss%C3%ADvel+excluir+o+registro";
  }

  revalidatePath("/admin/financial");
  redirect(target);
}

async function requestNfse(formData: FormData) {
  "use server";

  const { clinic, admin } = await requireClinicAccess([
    "superadmin",
    "admin",
    "financial",
  ]);
  const patientId = optional(formData.get("patient_id"));
  const procedureId = optional(formData.get("procedure_id"));
  const description = optional(formData.get("description"));
  const serviceCode = optional(formData.get("service_code"));
  let target = "/admin/financial";

  try {
    if (!patientId || !procedureId || !description) {
      target +=
        "?error=Informe+paciente%2C+servi%C3%A7o+e+descri%C3%A7%C3%A3o+da+NFSe";
    } else {
      const [patientRows, procedureRows] = await Promise.all([
        sql`select id, full_name, cpf, email from patients where id = ${patientId}::uuid and clinic_id = ${clinic.id}::uuid limit 1`,
        sql`select id, name, amount from procedures where id = ${procedureId}::uuid and clinic_id = ${clinic.id}::uuid limit 1`,
      ]);
      const patient = (patientRows as any[])[0];
      const procedure = (procedureRows as any[])[0];
      if (!patient || !procedure) {
        target += "?error=Paciente+ou+servi%C3%A7o+n%C3%A3o+encontrado";
      } else {
        const amount = parseMoney(
          String(formData.get("amount") || procedure.amount || "0"),
        );
        if (amount <= 0) {
          target += "?error=Informe+um+valor+v%C3%A1lido+para+a+NFSe";
        } else {
          const idempotencyKey = crypto
            .createHash("sha256")
            .update(
              `${clinic.id}:${patient.id}:${procedure.id}:${amount}:${description}`,
            )
            .digest("hex");
          const existing =
            await sql`select id, status from nfse_invoices where clinic_id = ${clinic.id}::uuid and idempotency_key = ${idempotencyKey} limit 1`;
          if ((existing as any[]).length) {
            target +=
              "?error=J%C3%A1+existe+uma+NFSe+solicitada+para+este+paciente%2C+servi%C3%A7o+e+valor";
          } else {
            const result = await issueNfse({
              idempotencyKey,
              patientName: patient.full_name,
              patientDocument: patient.cpf,
              patientEmail: patient.email,
              serviceName: procedure.name,
              serviceCode,
              description,
              amount,
            });

            await sql`
              insert into nfse_invoices (
                clinic_id, patient_id, procedure_id, requested_by, idempotency_key,
                patient_name, patient_document, service_name, service_code, description, amount,
                status, external_id, number, verification_code, pdf_url, xml_url, provider, environment,
                safe_response, error_message, issued_at
              ) values (
                ${clinic.id}::uuid, ${patient.id}::uuid, ${procedure.id}::uuid, ${admin.profile.id}::uuid, ${idempotencyKey},
                ${patient.full_name}, ${patient.cpf || null}, ${procedure.name}, ${serviceCode}, ${description}, ${amount},
                ${result.status}, ${result.externalId || null}, ${result.number || null}, ${result.verificationCode || null}, ${result.pdfUrl || null}, ${result.xmlUrl || null}, ${process.env.NFSE_PROVIDER || "national"}, ${process.env.NFSE_ENVIRONMENT || "homologation"},
                ${JSON.stringify(result.safeResponse || {})}::jsonb, ${result.status === "failed" || result.status === "configuration_required" ? result.message : null}, ${result.status === "issued" ? new Date().toISOString() : null}
              )
            `;
            target +=
              result.status === "configuration_required"
                ? "?ok=Solicita%C3%A7%C3%A3o+registrada.+Configure+o+provedor+NFSe+para+emiss%C3%A3o+real"
                : result.status === "issued"
                  ? "?ok=NFSe+emitida+com+sucesso"
                  : "?ok=Solicita%C3%A7%C3%A3o+de+NFSe+registrada";
          }
        }
      }
    }
  } catch (error) {
    console.error("nfse.request");
    target +=
      "?error=N%C3%A3o+foi+poss%C3%ADvel+solicitar+a+NFSe.+Verifique+se+a+migration+foi+aplicada";
  }

  revalidatePath("/admin/financial");
  redirect(`${target}#nfse`);
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>;
}) {
  const { clinic } = await requireClinicAccess([
    "superadmin",
    "admin",
    "financial",
  ]);
  const params = (await searchParams) ?? {};

  const [rows, patientsResult, budgetsResult, summary, proceduresResult] =
    await Promise.all([
      sql`
      select fe.*, p.full_name patient_name
        from financial_entries fe
        join patients p on p.id = fe.patient_id and p.clinic_id = fe.clinic_id
       where fe.clinic_id = ${clinic.id}::uuid
       order by fe.created_at desc
       limit 100
    `,
      sql`select id, full_name, cpf, email from patients where clinic_id = ${clinic.id}::uuid order by full_name`,
      sql`select id from budgets where clinic_id = ${clinic.id}::uuid order by created_at desc limit 100`,
      sql`
      select
        coalesce(sum(amount) filter (where status = 'paid'), 0)::numeric as paid,
        coalesce(sum(amount) filter (where status = 'pending'), 0)::numeric as pending,
        coalesce(sum(amount) filter (where status = 'overdue'), 0)::numeric as overdue,
        count(*)::int as total
      from financial_entries
      where clinic_id = ${clinic.id}::uuid
    `,
      sql`select id, name, amount from procedures where clinic_id = ${clinic.id}::uuid and is_active = true order by name`,
    ]);

  let nfseInvoices: any[] = [];
  try {
    const nfseRows = await sql`
      select id, patient_name, patient_document, service_name, service_code, amount, status, number, verification_code, pdf_url, xml_url, error_message, created_at, updated_at
        from nfse_invoices
       where clinic_id = ${clinic.id}::uuid
       order by created_at desc
       limit 30
    `;
    nfseInvoices = nfseRows as any[];
  } catch {
    nfseInvoices = [];
  }

  let certificateSettings: any | null = null;
  try {
    const certificateRows = await sql`
      select certificate_type, document_number, provider_name, environment, city_code, municipal_registration, file_name, valid_until, updated_at
        from nfse_certificate_settings
       where clinic_id = ${clinic.id}::uuid
       limit 1
    `;
    certificateSettings = (certificateRows as any[])[0] ?? null;
  } catch {
    certificateSettings = null;
  }

  const patients = patientsResult as any[];
  const budgets = budgetsResult as any[];
  const procedures = proceduresResult as any[];
  const totals = (summary as any[])[0] || {};
  const entries = rows as any[];

  const cards = [
    {
      label: "Recebido",
      value: currency.format(Number(totals.paid || 0)),
      icon: "trending_up",
    },
    {
      label: "Pendente",
      value: currency.format(Number(totals.pending || 0)),
      icon: "schedule",
    },
    {
      label: "Vencido",
      value: currency.format(Number(totals.overdue || 0)),
      icon: "warning",
    },
    {
      label: "Lançamentos",
      value: Number(totals.total || 0).toLocaleString("pt-BR"),
      icon: "receipt_long",
    },
  ];

  return (
    <section className="space-y-8">
      <div className="premium-hero">
        <span className="premium-kicker">
          <AdminIcon name="account_balance_wallet" className="admin-svg-icon" />
          Gestão financeira
        </span>
        <h1>Financeiro da clínica</h1>
        <p>
          Controle lançamentos, vencimentos, recebimentos, histórico financeiro
          e emissão de NFS-e vinculada aos pacientes e serviços.
        </p>
      </div>

      <div className="premium-stat-grid">
        {cards.map((card) => (
          <article key={card.label} className="premium-stat-card">
            <span className="premium-stat-icon">
              <AdminIcon name={card.icon} className="admin-svg-icon" />
            </span>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <FormFeedback ok={params.ok} error={params.error} />

      <form action={save} className="grid gap-3 md:grid-cols-2">
        <select name="patient_id" required>
          <option value="">Paciente *</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.full_name}
            </option>
          ))}
        </select>
        <select name="budget_id">
          <option value="">Orçamento</option>
          {budgets.map((budget) => (
            <option key={budget.id} value={budget.id}>
              {budget.id.slice(0, 8)}
            </option>
          ))}
        </select>
        <input name="description" required placeholder="Descrição *" />
        <input name="payment_method" placeholder="Forma de pagamento" />
        <input name="due_date" type="date" />
        <input name="amount" required placeholder="Valor ex: 100,00" />
        <select name="status">
          {financeStatus.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
        <SubmitButton label="Cadastrar lançamento" />
      </form>

      <div className="overflow-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr>
              <th className="text-left">Paciente</th>
              <th className="text-left">Descrição</th>
              <th className="text-left">Vencimento</th>
              <th className="text-left">Status</th>
              <th className="text-left">Valor</th>
              <th className="text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="align-top">
                <td className="font-medium">{entry.patient_name}</td>
                <td>{entry.description}</td>
                <td>{formatDate(entry.due_date)}</td>
                <td>
                  <span className="premium-status">
                    {statusLabel(entry.status)}
                  </span>
                </td>
                <td className="font-semibold text-[#041627]">
                  {currency.format(Number(entry.amount))}
                </td>
                <td className="space-y-2">
                  <details className="p-3">
                    <summary className="cursor-pointer">Editar</summary>
                    <form action={save} className="mt-3 grid gap-2">
                      <input type="hidden" name="id" value={entry.id} />
                      <select name="patient_id" defaultValue={entry.patient_id}>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.full_name}
                          </option>
                        ))}
                      </select>
                      <select
                        name="budget_id"
                        defaultValue={entry.budget_id || ""}
                      >
                        <option value="">Orçamento</option>
                        {budgets.map((budget) => (
                          <option key={budget.id} value={budget.id}>
                            {budget.id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                      <input
                        name="description"
                        defaultValue={entry.description}
                      />
                      <input
                        name="payment_method"
                        defaultValue={entry.payment_method || ""}
                      />
                      <input
                        name="due_date"
                        type="date"
                        defaultValue={entry.due_date || ""}
                      />
                      <input
                        name="amount"
                        defaultValue={String(entry.amount).replace(".", ",")}
                      />
                      <select name="status" defaultValue={entry.status}>
                        {financeStatus.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                      <SubmitButton label="Atualizar" />
                    </form>
                  </details>
                  <form action={remove} className="p-0 shadow-none">
                    <input type="hidden" name="id" value={entry.id} />
                    <DeleteConfirmButton
                      message={`Excluir lançamento ${entry.description}?`}
                    />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div id="nfse" className="scroll-mt-6 space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Nota Fiscal de Serviço Eletrônica
          </p>
          <h2 className="text-2xl font-bold">NFS-e no Financeiro</h2>
          <p className="text-sm text-slate-600">
            A emissão, acompanhamento de status e histórico fiscal ficam
            centralizados no módulo financeiro. O fluxo preserva o adapter já
            existente e não executa emissão real sem provedor configurado.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <form
            action={requestNfse}
            className="space-y-4 rounded-xl border bg-white p-5 shadow-sm"
          >
            <div>
              <h3 className="text-xl font-bold">Emitir NFS-e</h3>
              <p className="text-sm text-slate-600">
                Informe tomador, serviço, valor e descrição para registrar a
                solicitação fiscal.
              </p>
            </div>
            <label>
              Dados do tomador <strong className="required-mark">*</strong>
              <select name="patient_id" required>
                <option value="">Selecione o paciente/tomador</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name}
                    {patient.cpf ? ` · CPF ${patient.cpf}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dados do serviço <strong className="required-mark">*</strong>
              <select name="procedure_id" required>
                <option value="">Selecione o serviço/procedimento</option>
                {procedures.map((procedure) => (
                  <option key={procedure.id} value={procedure.id}>
                    {procedure.name} ·{" "}
                    {currency.format(Number(procedure.amount))}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Código do serviço municipal
              <input
                name="service_code"
                placeholder="Ex.: item da lista de serviços/ISS"
              />
            </label>
            <label>
              Valor da nota <strong className="required-mark">*</strong>
              <input name="amount" placeholder="Ex.: 250,00" required />
            </label>
            <label>
              Descrição da nota <strong className="required-mark">*</strong>
              <textarea
                name="description"
                required
                rows={4}
                placeholder="Descreva o serviço prestado conforme exigência municipal."
              />
            </label>
            <SubmitButton label="Solicitar emissão de NFS-e" />
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Não informe tokens, senhas ou certificados neste formulário. O
              certificado digital deve ser configurado em Configurações.
            </p>
          </form>

          <div className="space-y-5">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold">Status da configuração</h3>
              {certificateSettings ? (
                <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <p>
                    <strong>Certificado:</strong>{" "}
                    {certificateSettings.certificate_type === "e_cpf"
                      ? "e-CPF"
                      : "e-CNPJ"}
                  </p>
                  <p>
                    <strong>Arquivo:</strong>{" "}
                    {certificateSettings.file_name || "não enviado"}
                  </p>
                  <p>
                    <strong>Documento:</strong>{" "}
                    {certificateSettings.document_number || "não informado"}
                  </p>
                  <p>
                    <strong>Ambiente:</strong>{" "}
                    {certificateSettings.environment === "production"
                      ? "Produção"
                      : "Homologação"}
                  </p>
                  <p>
                    <strong>Provedor:</strong>{" "}
                    {certificateSettings.provider_name || "não informado"}
                  </p>
                  <p>
                    <strong>Código do município:</strong>{" "}
                    {certificateSettings.city_code || "não informado"}
                  </p>
                  <p>
                    <strong>Validade:</strong>{" "}
                    {formatDate(certificateSettings.valid_until)}
                  </p>
                  <p>
                    <strong>Atualizado em:</strong>{" "}
                    {formatDateTime(certificateSettings.updated_at)}
                  </p>
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  Certificado digital não configurado. Cadastre o e-CNPJ/e-CPF
                  em Configurações para preparar a emissão fiscal.
                </p>
              )}
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold">Histórico de notas</h3>
              <p className="text-sm text-slate-600">
                Acompanhe número, status, arquivos e retorno seguro do provedor.
              </p>
              {nfseInvoices.length ? (
                <div className="mt-4 overflow-auto">
                  <table className="w-full min-w-[780px] text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Tomador</th>
                        <th className="text-left">Serviço</th>
                        <th className="text-left">Valor</th>
                        <th className="text-left">Status</th>
                        <th className="text-left">Número</th>
                        <th className="text-left">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nfseInvoices.map((invoice) => (
                        <tr key={invoice.id} className="align-top">
                          <td>{invoice.patient_name || "-"}</td>
                          <td>{invoice.service_name || "-"}</td>
                          <td>{currency.format(Number(invoice.amount))}</td>
                          <td>
                            <span className="premium-status">
                              {statusLabel(invoice.status)}
                            </span>
                            {invoice.error_message ? (
                              <small className="mt-1 block text-red-700">
                                {invoice.error_message}
                              </small>
                            ) : null}
                          </td>
                          <td>
                            {invoice.number || "-"}
                            {invoice.verification_code ? (
                              <small className="block text-slate-500">
                                Código: {invoice.verification_code}
                              </small>
                            ) : null}
                          </td>
                          <td className="space-x-2">
                            {invoice.pdf_url ? (
                              <a
                                className="text-blue-700 underline"
                                href={invoice.pdf_url}
                                target="_blank"
                              >
                                PDF
                              </a>
                            ) : null}
                            {invoice.xml_url ? (
                              <a
                                className="text-blue-700 underline"
                                href={invoice.xml_url}
                                target="_blank"
                              >
                                XML
                              </a>
                            ) : null}
                            {!invoice.pdf_url && !invoice.xml_url ? "-" : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  Nenhuma NFS-e registrada ainda. Aplique as migrations de NFS-e
                  para habilitar o histórico fiscal.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
