-- SmileHub - termos de autorização/responsabilidade do odontograma
-- Compatível com PostgreSQL/Neon. Não remove dados existentes.

create table if not exists public.odontogram_terms (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  odontogram_id uuid,
  odontogram_entry_ids uuid[] not null default '{}'::uuid[],
  chart_type text not null check (chart_type in ('adult', 'children')),
  guardian_data jsonb not null default '{}'::jsonb,
  patient_snapshot jsonb not null default '{}'::jsonb,
  procedures_snapshot jsonb not null default '[]'::jsonb,
  child_name text,
  birth_or_age text,
  guardian_name text,
  guardian_document text,
  guardian_phone text,
  relationship text,
  authorization_date date,
  professional_name text,
  authorized_procedures text,
  term_text text,
  related_teeth text[] not null default '{}'::text[],
  signature_data_url text,
  status text not null default 'draft' check (status in ('draft', 'signed', 'canceled')),
  version integer not null default 1 check (version > 0),
  parent_term_id uuid references public.odontogram_terms(id) on delete set null,
  created_by uuid references public."user"(id) on delete set null,
  updated_by uuid references public."user"(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint odontogram_terms_signature_format_check
    check (signature_data_url is null or signature_data_url like 'data:image/%;base64,%')
);

create index if not exists odontogram_terms_clinic_patient_chart_idx
  on public.odontogram_terms (clinic_id, patient_id, chart_type, updated_at desc);

create index if not exists odontogram_terms_parent_idx
  on public.odontogram_terms (parent_term_id, version)
  where parent_term_id is not null;

create index if not exists odontogram_terms_entry_ids_gin_idx
  on public.odontogram_terms using gin (odontogram_entry_ids);

create index if not exists odontogram_terms_related_teeth_gin_idx
  on public.odontogram_terms using gin (related_teeth);

DO $$ BEGIN
  CREATE TRIGGER set_odontogram_terms_updated_at
  BEFORE UPDATE ON public.odontogram_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
