"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useAuth } from "@/app/components/AppProvider";

type ProfileData = {
  id?: string;
  name: string;
  email: string;
  role?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProfileModalButtonProps = {
  label?: string;
  className?: string;
  buttonClassName?: string;
  trigger?: ReactNode;
};

const roleLabels: Record<string, string> = {
  superadmin: "Super administrador",
  admin: "Administrador",
  dentist: "Dentista",
  reception: "Recepção",
  financial: "Financeiro",
};

function formatDate(value?: string | null) {
  if (!value) return "Não informado";
  return new Date(value).toLocaleString("pt-BR");
}

export function ProfileModalButton({
  label = "Editar perfil",
  className,
  buttonClassName,
  trigger,
}: ProfileModalButtonProps) {
  const { refreshSession } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError("");
    fetch("/api/admin/profile", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.message || "Não foi possível carregar o perfil.",
          );
        if (active) setProfile(data.profile);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const formElement = event.currentTarget;
    setSaving(true);
    setError("");
    setSuccess("");
    const form = new FormData(formElement);

    try {
      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        body: form,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Não foi possível salvar o perfil.");
      setProfile(data.profile);
      setSuccess("Perfil atualizado com sucesso.");
      formElement
        .querySelectorAll<HTMLInputElement>(
          'input[type="password"], input[type="file"]',
        )
        .forEach((input) => {
          input.value = "";
        });
      await refreshSession();
    } catch (err: any) {
      setError(err.message || "Não foi possível salvar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className={className}>
      <button
        type="button"
        className={
          buttonClassName ||
          "rounded-full border px-4 py-2 text-sm font-semibold hover:bg-blue-50"
        }
        onClick={() => setOpen(true)}
      >
        {trigger || label}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                  Perfil do usuário
                </p>
                <h2 id="profile-modal-title" className="text-2xl font-bold">
                  Editar meus dados
                </h2>
                <p className="text-sm text-slate-600">
                  Atualize nome, e-mail, telefone, avatar e senha do usuário
                  logado.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                Fechar
              </button>
            </div>

            {loading ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Carregando perfil...
              </p>
            ) : (
              <form
                key={profile.updated_at || profile.email}
                className="mt-5 grid gap-4"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <label>
                    Nome <strong className="required-mark">*</strong>
                    <input name="name" defaultValue={profile.name} required />
                  </label>
                  <label>
                    E-mail <strong className="required-mark">*</strong>
                    <input
                      name="email"
                      type="email"
                      defaultValue={profile.email || ""}
                      required
                    />
                  </label>
                  <label>
                    Telefone/WhatsApp
                    <input
                      name="phone"
                      defaultValue={profile.phone || ""}
                      placeholder="(00) 00000-0000"
                    />
                  </label>
                  <label>
                    Perfil de acesso
                    <input
                      value={
                        profile.role
                          ? roleLabels[profile.role] || profile.role
                          : "Não definido"
                      }
                      readOnly
                      disabled
                    />
                  </label>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
                  <p>
                    <strong>ID do usuário:</strong>{" "}
                    {profile.id || "Não informado"}
                  </p>
                  <p>
                    <strong>Criado em:</strong> {formatDate(profile.created_at)}
                  </p>
                  <p>
                    <strong>Última atualização:</strong>{" "}
                    {formatDate(profile.updated_at)}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-[120px_1fr] md:items-center">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar atual"
                      className="h-24 w-24 rounded-full border object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border bg-slate-50 text-xs text-slate-500">
                      Sem foto
                    </div>
                  )}
                  <div className="space-y-3">
                    <label className="block">
                      Foto/avatar
                      <input
                        name="avatar"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="mt-1 block w-full"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="remove_avatar" />
                      Remover foto atual
                    </label>
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <h3 className="font-semibold">Alterar senha</h3>
                  <p className="mb-3 text-sm text-slate-600">
                    Preencha apenas se desejar trocar a senha. A senha atual é
                    obrigatória para confirmar a alteração.
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label>
                      Senha atual
                      <input
                        name="current_password"
                        type="password"
                        autoComplete="current-password"
                      />
                    </label>
                    <label>
                      Nova senha
                      <input
                        name="new_password"
                        type="password"
                        minLength={8}
                        autoComplete="new-password"
                      />
                    </label>
                    <label>
                      Confirmar nova senha
                      <input
                        name="confirm_password"
                        type="password"
                        minLength={8}
                        autoComplete="new-password"
                      />
                    </label>
                  </div>
                </div>

                {error ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}
                {success ? (
                  <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    {success}
                  </p>
                ) : null}
                <button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar perfil"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </span>
  );
}
