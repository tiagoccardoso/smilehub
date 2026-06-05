-- SmileHub - compatibilidade de carregamento do Odontograma
-- Garante que bancos Neon já existentes tenham as colunas/tabelas usadas
-- pela tela /admin/odontogram sem remover dados atuais.

create table if not exists public.odontogram_entries (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  tooth_code text not null,
  condition text,
  procedure_id uuid references public.procedures(id) on delete set null,
  planned_procedure text,
  performed_procedure text,
  notes text,
  status text not null default 'planned',
  scheduled_date date,
  created_by uuid references public."user"(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.odontogram_entries
  add column if not exists clinic_id uuid,
  add column if not exists procedure_id uuid,
  add column if not exists status text default 'planned',
  add column if not exists scheduled_date date,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.odontogram_entries oe
   set clinic_id = p.clinic_id
  from public.patients p
 where oe.patient_id = p.id
   and oe.clinic_id is null;

update public.odontogram_entries
   set status = 'planned'
 where status is null or status not in ('planned','in_progress','completed','canceled');

alter table public.odontogram_entries
  alter column status set default 'planned',
  alter column status set not null;

do $$ begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'odontogram_entries_clinic_id_fkey'
       and conrelid = 'public.odontogram_entries'::regclass
  ) then
    alter table public.odontogram_entries
      add constraint odontogram_entries_clinic_id_fkey
      foreign key (clinic_id) references public.clinics(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'odontogram_entries_procedure_id_fkey'
       and conrelid = 'public.odontogram_entries'::regclass
  ) then
    alter table public.odontogram_entries
      add constraint odontogram_entries_procedure_id_fkey
      foreign key (procedure_id) references public.procedures(id) on delete set null;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'odontogram_entries_created_by_fkey'
       and conrelid = 'public.odontogram_entries'::regclass
  ) then
    alter table public.odontogram_entries
      add constraint odontogram_entries_created_by_fkey
      foreign key (created_by) references public."user"(id) on delete set null;
  end if;
end $$;

do $$ begin
  alter table public.odontogram_entries
    add constraint odontogram_entries_status_check
    check (status in ('planned','in_progress','completed','canceled'));
exception when duplicate_object then null;
end $$;

do $$ begin
  if not exists (select 1 from public.odontogram_entries where clinic_id is null) then
    alter table public.odontogram_entries alter column clinic_id set not null;
  end if;
end $$;

create index if not exists odontogram_entries_clinic_patient_tooth_idx
  on public.odontogram_entries (clinic_id, patient_id, tooth_code, updated_at desc);

create index if not exists odontogram_entries_procedure_idx
  on public.odontogram_entries (procedure_id)
  where procedure_id is not null;

create table if not exists public.odontogram_terms (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  odontogram_id uuid,
  odontogram_entry_ids uuid[] not null default '{}'::uuid[],
  chart_type text not null default 'adult',
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
  status text not null default 'draft',
  version integer not null default 1,
  parent_term_id uuid references public.odontogram_terms(id) on delete set null,
  created_by uuid references public."user"(id) on delete set null,
  updated_by uuid references public."user"(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.odontogram_terms
  add column if not exists clinic_id uuid,
  add column if not exists patient_id uuid,
  add column if not exists odontogram_id uuid,
  add column if not exists odontogram_entry_ids uuid[] not null default '{}'::uuid[],
  add column if not exists chart_type text not null default 'adult',
  add column if not exists guardian_data jsonb not null default '{}'::jsonb,
  add column if not exists patient_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists procedures_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists child_name text,
  add column if not exists birth_or_age text,
  add column if not exists guardian_name text,
  add column if not exists guardian_document text,
  add column if not exists guardian_phone text,
  add column if not exists relationship text,
  add column if not exists authorization_date date,
  add column if not exists professional_name text,
  add column if not exists authorized_procedures text,
  add column if not exists term_text text,
  add column if not exists related_teeth text[] not null default '{}'::text[],
  add column if not exists signature_data_url text,
  add column if not exists status text not null default 'draft',
  add column if not exists version integer not null default 1,
  add column if not exists parent_term_id uuid,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.odontogram_terms
   set chart_type = 'adult'
 where chart_type is null or chart_type not in ('adult','children');

update public.odontogram_terms
   set status = 'draft'
 where status is null or status not in ('draft','signed','canceled');

update public.odontogram_terms
   set version = 1
 where version is null or version < 1;

alter table public.odontogram_terms
  alter column chart_type set default 'adult',
  alter column chart_type set not null,
  alter column status set default 'draft',
  alter column status set not null,
  alter column version set default 1,
  alter column version set not null;

do $$ begin
  alter table public.odontogram_terms
    add constraint odontogram_terms_chart_type_check
    check (chart_type in ('adult', 'children'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.odontogram_terms
    add constraint odontogram_terms_status_check
    check (status in ('draft', 'signed', 'canceled'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.odontogram_terms
    add constraint odontogram_terms_version_check
    check (version > 0);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.odontogram_terms
    add constraint odontogram_terms_signature_format_check
    check (signature_data_url is null or signature_data_url like 'data:image/%;base64,%');
exception when duplicate_object then null;
end $$;

do $$ begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'odontogram_terms_clinic_id_fkey'
       and conrelid = 'public.odontogram_terms'::regclass
  ) then
    alter table public.odontogram_terms
      add constraint odontogram_terms_clinic_id_fkey
      foreign key (clinic_id) references public.clinics(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'odontogram_terms_patient_id_fkey'
       and conrelid = 'public.odontogram_terms'::regclass
  ) then
    alter table public.odontogram_terms
      add constraint odontogram_terms_patient_id_fkey
      foreign key (patient_id) references public.patients(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'odontogram_terms_parent_term_id_fkey'
       and conrelid = 'public.odontogram_terms'::regclass
  ) then
    alter table public.odontogram_terms
      add constraint odontogram_terms_parent_term_id_fkey
      foreign key (parent_term_id) references public.odontogram_terms(id) on delete set null;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'odontogram_terms_created_by_fkey'
       and conrelid = 'public.odontogram_terms'::regclass
  ) then
    alter table public.odontogram_terms
      add constraint odontogram_terms_created_by_fkey
      foreign key (created_by) references public."user"(id) on delete set null;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'odontogram_terms_updated_by_fkey'
       and conrelid = 'public.odontogram_terms'::regclass
  ) then
    alter table public.odontogram_terms
      add constraint odontogram_terms_updated_by_fkey
      foreign key (updated_by) references public."user"(id) on delete set null;
  end if;
end $$;

create index if not exists odontogram_terms_clinic_patient_chart_idx
  on public.odontogram_terms (clinic_id, patient_id, chart_type, updated_at desc);

create index if not exists odontogram_terms_parent_idx
  on public.odontogram_terms (parent_term_id, version)
  where parent_term_id is not null;

create index if not exists odontogram_terms_entry_ids_gin_idx
  on public.odontogram_terms using gin (odontogram_entry_ids);

create index if not exists odontogram_terms_related_teeth_gin_idx
  on public.odontogram_terms using gin (related_teeth);

do $$ begin
  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'set_updated_at'
  ) then
    create trigger set_odontogram_entries_updated_at
    before update on public.odontogram_entries
    for each row execute function public.set_updated_at();
  end if;
exception when duplicate_object then null;
end $$;

do $$ begin
  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'set_updated_at'
  ) then
    create trigger set_odontogram_terms_updated_at
    before update on public.odontogram_terms
    for each row execute function public.set_updated_at();
  end if;
exception when duplicate_object then null;
end $$;
