-- Compatibiliza autenticação para usar a tabela "user" existente no Neon/PostgreSQL.
-- Mantém dados legados de admin_users sem perda.

create table if not exists public."user" (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role public.admin_role not null default 'admin',
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_email_lookup_idx on public."user" (email);

drop trigger if exists set_user_updated_at on public."user";
create trigger set_user_updated_at
before update on public."user"
for each row execute function public.set_updated_at();

insert into public."user" (id, email, name, role, password_hash, created_at, updated_at)
select id, email, name, role, coalesce(password_hash, ''), created_at, updated_at
from public.admin_users au
where au.email is not null
  and au.password_hash is not null
  and not exists (select 1 from public."user" u where u.id = au.id);
