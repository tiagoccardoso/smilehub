-- SmileHub - controle de assinaturas, teste grátis e Stripe
-- Executar em produção antes de habilitar o checkout/webhook.
-- Não apaga dados existentes e não contém secrets.

alter table public.clinic_subscriptions
  add column if not exists trial_started_at timestamptz,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists canceled_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists updated_by_webhook_event_id text;

update public.clinic_subscriptions
   set trial_started_at = coalesce(trial_started_at, created_at)
 where status = 'trialing'
   and trial_ends_at is not null
   and trial_started_at is null;

do $$
begin
  if exists (
    select 1 from pg_constraint
     where conrelid = 'public.clinic_subscriptions'::regclass
       and conname = 'clinic_subscriptions_plan_code_check'
  ) then
    alter table public.clinic_subscriptions drop constraint clinic_subscriptions_plan_code_check;
  end if;

  if exists (
    select 1 from pg_constraint
     where conrelid = 'public.clinic_subscriptions'::regclass
       and conname = 'clinic_subscriptions_status_check'
  ) then
    alter table public.clinic_subscriptions drop constraint clinic_subscriptions_status_check;
  end if;
end $$;

alter table public.clinic_subscriptions
  add constraint clinic_subscriptions_plan_code_check
  check (plan_code in ('gestao','personalizado','mensal','anual'));

alter table public.clinic_subscriptions
  add constraint clinic_subscriptions_status_check
  check (status in ('trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid','paused'));

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.clinic_subscriptions'::regclass
       and conname = 'clinic_subscriptions_stripe_subscription_id_key'
  ) then
    alter table public.clinic_subscriptions
      add constraint clinic_subscriptions_stripe_subscription_id_key unique (stripe_subscription_id);
  end if;
end $$;

create index if not exists clinic_subscriptions_clinic_created_idx
  on public.clinic_subscriptions (clinic_id, created_at desc);

create index if not exists clinic_subscriptions_stripe_customer_idx
  on public.clinic_subscriptions (stripe_customer_id);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);
