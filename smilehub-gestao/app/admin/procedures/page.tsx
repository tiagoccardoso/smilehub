import { sql } from "@/lib/neon";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClinicAccess } from "@/lib/clinic";
import { SubmitButton } from "../_components/submit-button";
import { FormFeedback } from "../_components/form-feedback";
import { DeleteConfirmButton } from "../_components/delete-confirm-button";

const parseMoney = (value: string) =>
  Number(value.replace(/\./g, "").replace(",", ".")) || 0;
const optional = (value: FormDataEntryValue | null) =>
  String(value || "").trim() || null;
const money = (value: unknown) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

async function saveProcedure(formData: FormData) {
  "use server";

  const { clinic } = await requireClinicAccess([
    "superadmin",
    "admin",
    "dentist",
  ]);

  const id = optional(formData.get("id"));
  const name = optional(formData.get("name"));
  let target = "/admin/procedures";

  try {
    if (!name) {
      target += "?error=Informe+o+nome+do+procedimento";
    } else if (id) {
      const updated = await sql`
        update procedures
           set name = ${name},
               description = ${optional(formData.get("description"))},
               amount = ${parseMoney(String(formData.get("amount") || "0"))},
               estimated_minutes = ${Number(formData.get("estimated_minutes") || 0) || null},
               category = ${optional(formData.get("category"))},
               is_active = ${formData.get("is_active") === "on"}
         where id = ${id}::uuid and clinic_id = ${clinic.id}::uuid
         returning id
      `;
      target += (updated as unknown[]).length
        ? "?ok=Procedimento+atualizado+com+sucesso"
        : "?error=Procedimento+n%C3%A3o+encontrado";
    } else {
      await sql`
        insert into procedures (clinic_id, name, description, amount, estimated_minutes, category, is_active)
        values (${clinic.id}::uuid, ${name}, ${optional(formData.get("description"))}, ${parseMoney(String(formData.get("amount") || "0"))}, ${Number(formData.get("estimated_minutes") || 0) || null}, ${optional(formData.get("category"))}, ${formData.get("is_active") === "on"})
      `;
      target += "?ok=Procedimento+cadastrado+com+sucesso";
    }
  } catch (error) {
    console.error("procedures.save");
    target += "?error=N%C3%A3o+foi+poss%C3%ADvel+salvar+o+procedimento";
  }

  revalidatePath("/admin/procedures");
  redirect(target);
}

async function deleteProcedure(formData: FormData) {
  "use server";

  const { clinic } = await requireClinicAccess([
    "superadmin",
    "admin",
    "dentist",
  ]);

  let target = "/admin/procedures";
  try {
    const id = optional(formData.get("id"));
    if (!id) {
      target += "?error=Procedimento+inv%C3%A1lido";
    } else {
      const deleted =
        await sql`delete from procedures where id = ${id}::uuid and clinic_id = ${clinic.id}::uuid returning id`;
      target += (deleted as unknown[]).length
        ? "?ok=Procedimento+exclu%C3%ADdo+com+sucesso"
        : "?error=Procedimento+n%C3%A3o+encontrado";
    }
  } catch (error) {
    console.error("procedures.delete");
    target +=
      "?error=N%C3%A3o+foi+poss%C3%ADvel+excluir.+Verifique+se+n%C3%A3o+h%C3%A1+v%C3%ADnculos";
  }

  revalidatePath("/admin/procedures");
  redirect(target);
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>;
}) {
  const { clinic } = await requireClinicAccess([
    "superadmin",
    "admin",
    "dentist",
    "financial",
  ]);

  const params = (await searchParams) ?? {};
  const rows =
    await sql`select * from procedures where clinic_id = ${clinic.id}::uuid order by created_at desc limit 100`;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Procedimentos e Serviços</h1>
        <p className="text-sm text-gray-600">
          Gerencie serviços/procedimentos usados nos agendamentos e orçamentos.
        </p>
      </div>
      <FormFeedback ok={params.ok} error={params.error} />
      <form
        action={saveProcedure}
        className="grid gap-3 rounded border bg-white p-4 md:grid-cols-2"
      >
        <label>
          Nome <strong className="required-mark">*</strong>
          <input name="name" required placeholder="Nome do procedimento" />
        </label>
        <label>
          Valor <strong className="required-mark">*</strong>
          <input name="amount" required placeholder="Valor ex: 120,50" />
        </label>
        <label>
          Duração estimada
          <input
            name="estimated_minutes"
            type="number"
            min={1}
            placeholder="Minutos"
          />
        </label>
        <label>
          Categoria
          <input name="category" placeholder="Categoria" />
        </label>
        <label className="md:col-span-2">
          Descrição
          <textarea name="description" placeholder="Descrição" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_active" defaultChecked />
          Ativo
        </label>
        <SubmitButton label="Cadastrar procedimento" />
      </form>

      <div className="overflow-auto rounded border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Nome</th>
              <th className="p-2 text-left">Valor</th>
              <th className="p-2 text-left">Categoria</th>
              <th className="p-2 text-left">Ativo</th>
              <th className="p-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(rows as any[]).map((row) => (
              <tr key={row.id} className="border-t align-top">
                <td className="p-2 font-medium">{row.name}</td>
                <td className="p-2">{money(row.amount)}</td>
                <td className="p-2">{row.category || "-"}</td>
                <td className="p-2">{row.is_active ? "Sim" : "Não"}</td>
                <td className="space-y-2 p-2">
                  <details className="rounded border p-2">
                    <summary className="cursor-pointer font-semibold text-blue-700">
                      Editar
                    </summary>
                    <form
                      action={saveProcedure}
                      className="mt-3 grid gap-2 md:grid-cols-2"
                    >
                      <input type="hidden" name="id" value={row.id} />
                      <label>
                        Nome <strong className="required-mark">*</strong>
                        <input name="name" defaultValue={row.name} required />
                      </label>
                      <label>
                        Valor <strong className="required-mark">*</strong>
                        <input
                          name="amount"
                          defaultValue={String(row.amount).replace(".", ",")}
                          required
                        />
                      </label>
                      <label>
                        Duração
                        <input
                          name="estimated_minutes"
                          type="number"
                          min={1}
                          defaultValue={row.estimated_minutes || ""}
                          placeholder="Duração"
                        />
                      </label>
                      <label>
                        Categoria
                        <input
                          name="category"
                          defaultValue={row.category || ""}
                          placeholder="Categoria"
                        />
                      </label>
                      <label className="md:col-span-2">
                        Descrição
                        <textarea
                          name="description"
                          className="md:col-span-2"
                          defaultValue={row.description || ""}
                        />
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="is_active"
                          defaultChecked={row.is_active}
                        />
                        Ativo
                      </label>
                      <SubmitButton label="Atualizar" />
                    </form>
                  </details>
                  <form action={deleteProcedure}>
                    <input type="hidden" name="id" value={row.id} />
                    <DeleteConfirmButton
                      message={`Excluir o procedimento ${row.name}?`}
                    />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
