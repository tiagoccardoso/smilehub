-- SmileHub - configuração segura da IA DeepSeek por clínica
-- O token/API Key é armazenado criptografado pelo servidor. Não grave tokens em logs,
-- arquivos públicos, localStorage ou código versionado.

create table if not exists public.clinic_ai_settings (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  provider text not null default 'deepseek',
  model text not null default 'deepseek-v4-flash',
  encrypted_api_key text,
  encryption_version text not null default 'aes-256-gcm:v1',
  status text not null default 'not_configured' check (status in ('not_configured','configured','invalid')),
  updated_by uuid references public."user"(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, provider)
);

create index if not exists clinic_ai_settings_clinic_provider_idx
  on public.clinic_ai_settings (clinic_id, provider, status);

DO $$ BEGIN
  CREATE TRIGGER set_clinic_ai_settings_updated_at
  BEFORE UPDATE ON public.clinic_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
