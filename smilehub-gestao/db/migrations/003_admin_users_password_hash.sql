alter table public.admin_users
  add column if not exists password_hash text;

create index if not exists admin_users_email_lookup_idx
  on public.admin_users (email);
