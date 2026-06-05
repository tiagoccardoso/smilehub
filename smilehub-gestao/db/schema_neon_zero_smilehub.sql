-- SmileHub - schema completo para Neon zerado
-- Executar em um banco vazio. Não contém secrets.

create extension if not exists pgcrypto;

create type public.admin_role as enum ('admin','superadmin','dentist','reception','financial');
create type public.booking_status as enum ('pending','completed','canceled');
create type public.patient_status as enum ('active','inactive');
create type public.appointment_status as enum ('scheduled','confirmed','in_progress','completed','canceled','no_show');
create type public.budget_status as enum ('draft','sent','approved','rejected','canceled');
create type public.finance_status as enum ('pending','paid','overdue','canceled');

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table public."user" (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role public.admin_role not null default 'admin',
  password_hash text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de compatibilidade para webhooks Neon Auth, caso o projeto use o provedor externo.
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  public_name text,
  document_number text,
  phone text,
  whatsapp text,
  email text,
  logo_url text,
  primary_color text not null default '#2563eb',
  public_description text,
  postal_code text,
  street text,
  number text,
  complement text,
  district text,
  city text,
  state text,
  country text not null default 'Brasil',
  status text not null default 'trialing' check (status in ('trialing','active','inactive','blocked','canceled')),
  website_enabled boolean not null default false,
  management_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinic_users (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references public."user"(id) on delete cascade,
  role public.admin_role not null default 'admin',
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, user_id)
);

create table public.clinic_domains (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  domain text not null,
  normalized_domain text not null unique,
  type text not null default 'subdomain' check (type in ('subdomain','custom')),
  status text not null default 'pending' check (status in ('pending','active','failed','disabled')),
  is_primary boolean not null default false,
  verification jsonb not null default '{}'::jsonb,
  dns_instructions jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinic_entitlements (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  feature_code text not null check (feature_code in ('management','public_website','online_booking','custom_domain')),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, feature_code)
);

create table public.clinic_subscriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  plan_code text not null default 'gestao' check (plan_code in ('gestao','personalizado','mensal','anual')),
  status text not null default 'trialing' check (status in ('trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid','paused')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  stripe_checkout_session_id text,
  canceled_at timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_by_webhook_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  full_name text not null,
  cpf text,
  birth_date date,
  phone text not null,
  email text,
  address text,
  guardian_name text,
  notes text,
  status public.patient_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  full_name text not null,
  specialty text,
  cro text,
  schedule_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.procedures (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  description text,
  amount numeric(12,2) not null default 0,
  estimated_minutes integer,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  mongo_id text unique,
  first_name text not null check (char_length(first_name) <= 60),
  last_name text not null check (char_length(last_name) <= 60),
  email text not null,
  phone text not null check (char_length(phone) <= 30),
  message text check (char_length(message) <= 500),
  status public.booking_status not null default 'pending',
  date date not null,
  time text not null,
  professional_id uuid references public.professionals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.professional_schedules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  break_start time,
  break_end time,
  appointment_duration_minutes integer not null default 60 check (appointment_duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professional_schedules_time_check check (end_time > start_time),
  constraint professional_schedules_break_check check ((break_start is null and break_end is null) or (break_start is not null and break_end is not null and break_end > break_start)),
  unique (clinic_id, professional_id, weekday)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  professional_id uuid references public.professionals(id) on delete set null,
  procedure_id uuid references public.procedures(id) on delete set null,
  notes text,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status public.appointment_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_check check (end_time > start_time)
);

create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete set null,
  anamnesis text,
  evolution text,
  performed_procedures text,
  dentist_notes text,
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.odontogram_entries (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  tooth_code text not null,
  condition text,
  procedure_id uuid references public.procedures(id) on delete set null,
  planned_procedure text,
  performed_procedure text,
  notes text,
  status text not null default 'planned' check (status in ('planned','in_progress','completed','canceled')),
  scheduled_date date,
  created_by uuid references public."user"(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  status public.budget_status not null default 'draft',
  notes text,
  total_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete cascade,
  procedure_id uuid references public.procedures(id) on delete set null,
  description text not null,
  quantity integer not null default 1,
  unit_amount numeric(12,2) not null default 0,
  line_total numeric(12,2) generated always as (quantity * unit_amount) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  budget_id uuid references public.budgets(id) on delete set null,
  description text not null,
  payment_method text,
  due_date date,
  paid_at timestamptz,
  amount numeric(12,2) not null,
  status public.finance_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_content_settings (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  section text not null check (section in ('home','about','services')),
  title text,
  subtitle text,
  body text,
  image_url text,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, section)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nfse_invoices (
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


create table public.nfse_certificate_settings (
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


create table public.clinic_ai_settings (
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

create index user_email_lookup_idx on public."user" (email);
create index users_email_lookup_idx on public.users (email);
create index clinic_users_user_idx on public.clinic_users (user_id);
create index clinic_subscriptions_clinic_created_idx on public.clinic_subscriptions (clinic_id, created_at desc);
create index clinic_subscriptions_stripe_customer_idx on public.clinic_subscriptions (stripe_customer_id);
create index clinic_domains_normalized_domain_idx on public.clinic_domains (normalized_domain);
create index patients_clinic_idx on public.patients (clinic_id, created_at desc);
create index professionals_clinic_idx on public.professionals (clinic_id, is_active, full_name);
create index procedures_clinic_idx on public.procedures (clinic_id, is_active, name);
create index bookings_clinic_date_idx on public.bookings (clinic_id, date, time);
create index bookings_clinic_status_idx on public.bookings (clinic_id, status);
create unique index bookings_professional_slot_unique_idx on public.bookings (clinic_id, professional_id, date, time) where professional_id is not null and status <> 'canceled';
create index appointments_clinic_schedule_idx on public.appointments (clinic_id, appointment_date, start_time, professional_id);
create index medical_records_clinic_patient_idx on public.medical_records (clinic_id, patient_id, created_at desc);
create index odontogram_entries_clinic_patient_tooth_idx on public.odontogram_entries (clinic_id, patient_id, tooth_code, updated_at desc);
create index budgets_clinic_idx on public.budgets (clinic_id, created_at desc);
create index budget_items_clinic_budget_idx on public.budget_items (clinic_id, budget_id);
create index financial_entries_clinic_status_idx on public.financial_entries (clinic_id, status, due_date);
create index site_content_settings_clinic_idx on public.site_content_settings (clinic_id, section);
create index services_clinic_idx on public.services (clinic_id, is_active, sort_order);
create index nfse_invoices_clinic_status_idx on public.nfse_invoices (clinic_id, status, created_at desc);
create index nfse_invoices_patient_idx on public.nfse_invoices (clinic_id, patient_id, created_at desc);
create index nfse_invoices_procedure_idx on public.nfse_invoices (clinic_id, procedure_id, created_at desc);
create index nfse_certificate_settings_clinic_idx on public.nfse_certificate_settings (clinic_id, status);
create index clinic_ai_settings_clinic_provider_idx on public.clinic_ai_settings (clinic_id, provider, status);

create trigger set_user_updated_at before update on public."user" for each row execute function public.set_updated_at();
create trigger set_users_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger set_clinics_updated_at before update on public.clinics for each row execute function public.set_updated_at();
create trigger set_clinic_users_updated_at before update on public.clinic_users for each row execute function public.set_updated_at();
create trigger set_clinic_domains_updated_at before update on public.clinic_domains for each row execute function public.set_updated_at();
create trigger set_clinic_entitlements_updated_at before update on public.clinic_entitlements for each row execute function public.set_updated_at();
create trigger set_clinic_subscriptions_updated_at before update on public.clinic_subscriptions for each row execute function public.set_updated_at();
create trigger set_patients_updated_at before update on public.patients for each row execute function public.set_updated_at();
create trigger set_professionals_updated_at before update on public.professionals for each row execute function public.set_updated_at();
create trigger set_procedures_updated_at before update on public.procedures for each row execute function public.set_updated_at();
create trigger set_bookings_updated_at before update on public.bookings for each row execute function public.set_updated_at();
create trigger set_professional_schedules_updated_at before update on public.professional_schedules for each row execute function public.set_updated_at();
create trigger set_appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create trigger set_medical_records_updated_at before update on public.medical_records for each row execute function public.set_updated_at();
create trigger set_odontogram_entries_updated_at before update on public.odontogram_entries for each row execute function public.set_updated_at();
create trigger set_budgets_updated_at before update on public.budgets for each row execute function public.set_updated_at();
create trigger set_budget_items_updated_at before update on public.budget_items for each row execute function public.set_updated_at();
create trigger set_financial_entries_updated_at before update on public.financial_entries for each row execute function public.set_updated_at();
create trigger set_site_content_settings_updated_at before update on public.site_content_settings for each row execute function public.set_updated_at();
create trigger set_services_updated_at before update on public.services for each row execute function public.set_updated_at();
create trigger set_nfse_invoices_updated_at before update on public.nfse_invoices for each row execute function public.set_updated_at();
create trigger set_nfse_certificate_settings_updated_at before update on public.nfse_certificate_settings for each row execute function public.set_updated_at();
create trigger set_clinic_ai_settings_updated_at before update on public.clinic_ai_settings for each row execute function public.set_updated_at();

-- Clínica demo opcional, útil para validar resolução por domínio.
insert into public.clinics (id, name, slug, public_name, email, status, website_enabled, management_enabled, public_description)
values ('00000000-0000-0000-0000-000000000001', 'Clínica Demo SmileHub', 'demo', 'Clínica Demo SmileHub', 'contato@demo.smilehub.com.br', 'trialing', true, true, 'Clínica demo para validação inicial do SmileHub.')
on conflict (id) do nothing;

insert into public.clinic_domains (clinic_id, domain, normalized_domain, type, status, is_primary)
values ('00000000-0000-0000-0000-000000000001', 'demo.smilehub.com.br', 'demo.smilehub.com.br', 'subdomain', 'active', true)
on conflict (normalized_domain) do nothing;

insert into public.clinic_entitlements (clinic_id, feature_code, enabled)
values
  ('00000000-0000-0000-0000-000000000001', 'management', true),
  ('00000000-0000-0000-0000-000000000001', 'public_website', true),
  ('00000000-0000-0000-0000-000000000001', 'online_booking', true),
  ('00000000-0000-0000-0000-000000000001', 'custom_domain', true)
on conflict (clinic_id, feature_code) do update set enabled = excluded.enabled;

insert into public.clinic_subscriptions (clinic_id, plan_code, status, trial_started_at, trial_ends_at)
values ('00000000-0000-0000-0000-000000000001', 'personalizado', 'trialing', now(), now() + interval '7 days')
on conflict do nothing;

insert into public.site_content_settings (clinic_id, section, title, subtitle, body, extra)
values
  ('00000000-0000-0000-0000-000000000001', 'home', 'Reconecte-se com o seu sorriso', 'SmileHub - Uma nova abordagem para o conforto odontológico', 'Torne seu sorriso perfeito ainda melhor', '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'about', 'Conheça a Clínica Demo SmileHub', 'Nossa missão', 'Oferecer cuidado odontológico excepcional em um ambiente confortável e acolhedor.', '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'services', 'Nossos serviços odontológicos', 'Tratamentos completos para prevenção, estética, restauração e reabilitação oral.', 'Edite esta área nas configurações para destacar serviços, diferenciais e orientações da clínica.', '{}'::jsonb)
on conflict (clinic_id, section) do nothing;
