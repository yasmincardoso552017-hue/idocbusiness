-- Papéis de usuário
do $$ begin
  create type public.app_role as enum ('admin','user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

drop policy if exists "own roles read" on public.user_roles;
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

drop policy if exists "admins read roles" on public.user_roles;
create policy "admins read roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Bloqueio de usuários
alter table public.profiles add column if not exists blocked boolean not null default false;
alter table public.profiles add column if not exists blocked_at timestamptz;

drop policy if exists "admins read profiles" on public.profiles;
create policy "admins read profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Lembretes agendados
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  target_user_id uuid,
  target_email text,
  document_id uuid references public.documents(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  request_id uuid references public.signing_requests(id) on delete set null,
  title text not null,
  body text,
  due_at timestamptz not null,
  repeat_every text,
  status text not null default 'scheduled',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.reminders to authenticated;
grant all on public.reminders to service_role;
alter table public.reminders enable row level security;

drop policy if exists "own reminders" on public.reminders;
create policy "own reminders" on public.reminders for all to authenticated
  using (auth.uid() = owner_id or auth.uid() = target_user_id)
  with check (auth.uid() = owner_id);

create index if not exists reminders_due_idx on public.reminders (status, due_at);

-- Assinaturas de push (web push)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
alter table public.push_subscriptions enable row level security;

drop policy if exists "own push subs" on public.push_subscriptions;
create policy "own push subs" on public.push_subscriptions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notificações: permitir inserção pelo próprio usuário e leitura já existente
drop policy if exists "own notifications insert" on public.notifications;
create policy "own notifications insert" on public.notifications for insert to authenticated with check (auth.uid() = user_id);
grant insert on public.notifications to authenticated;
