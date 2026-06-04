-- SmileHub - configuração segura do certificado digital para NFS-e
-- Não armazene certificados em local público. O app grava arquivo/senha criptografados
-- usando NFSE_CERTIFICATE_ENCRYPTION_KEY ou outro secret de servidor configurado.

create table if not exists public.nfse_certificate_settings (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  certificate_type text not null default 'e_cnpj' check (certificate_type in ('e_cnpj','e_cpf')),
  document_number text,
  provider_name text,
  environment text not null default 'homologation' check (environment in ('homologation','production')),
  city_code text,
  municipal_registration text,
  file_name text,
  mime_type text,
  size_bytes integer check (size_bytes is null or size_bytes >= 0),
  encrypted_certificate text,
  encrypted_password text,
  has_password boolean not null default false,
  encryption_version text not null default 'aes-256-gcm:v1',
  valid_until date,
  status text not null default 'not_configured' check (status in ('not_configured','configured','invalid','expired')),
  updated_by uuid references public."user"(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id)
);

create index if not exists nfse_certificate_settings_clinic_idx on public.nfse_certificate_settings (clinic_id, status);

DO $$ BEGIN
  CREATE TRIGGER set_nfse_certificate_settings_updated_at
  BEFORE UPDATE ON public.nfse_certificate_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
