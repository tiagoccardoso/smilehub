alter table public.admin_users
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists email text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_users'
      and column_name = 'password'
  ) then
    alter table public.admin_users alter column password drop not null;
  end if;
end $$;

create unique index if not exists admin_users_auth_user_id_key
  on public.admin_users (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists admin_users_email_key
  on public.admin_users (email)
  where email is not null;
