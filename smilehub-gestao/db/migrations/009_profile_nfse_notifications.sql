-- SmileHub - perfil do usuário e estrutura segura para NFSe
-- Execute antes de usar edição de perfil, upload de avatar/logo e emissão fiscal.
-- Não contém credenciais; configure o provedor por variáveis de ambiente.

alter table public."user"
  add column if not exists phone text,
  add column if not exists avatar_url text;

create table if not exists public.nfse_invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  procedure_id uuid references public.procedures(id) on delete set null,
  requested_by uuid references public."user"(id) on delete set null,
  idempotency_key text not null,
  patient_name text,
  patient_document text,
  service_name text,
  service_code text,
  description text not null,
  amount numeric(12,2) not null default 0,
  status text not null default 'configuration_required' check (status in ('draft','configuration_required','processing','issued','failed','canceled')),
  external_id text,
  number text,
  verification_code text,
  pdf_url text,
  xml_url text,
  provider text not null default 'national',
  environment text not null default 'homologation',
  safe_response jsonb not null default '{}'::jsonb,
  error_message text,
  issued_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, idempotency_key)
);

create index if not exists nfse_invoices_clinic_status_idx on public.nfse_invoices (clinic_id, status, created_at desc);
create index if not exists nfse_invoices_patient_idx on public.nfse_invoices (clinic_id, patient_id, created_at desc);
create index if not exists nfse_invoices_procedure_idx on public.nfse_invoices (clinic_id, procedure_id, created_at desc);

DO $$ BEGIN
  CREATE TRIGGER set_nfse_invoices_updated_at
  BEFORE UPDATE ON public.nfse_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
