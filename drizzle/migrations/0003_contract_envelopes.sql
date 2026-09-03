alter table public.contracts
  add column if not exists request_id uuid references public.signing_requests(id) on delete set null,
  add column if not exists stage text not null default 'draft',
  add column if not exists sent_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists voided_at timestamptz,
  add column if not exists decline_reason text;

create table if not exists public.contract_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  request_id uuid references public.signing_requests(id) on delete set null,
  event_type text not null,
  message text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

grant select, insert on public.contract_events to authenticated;
grant all on public.contract_events to service_role;

alter table public.contract_events enable row level security;

do $$ begin
  create policy "own contract events select" on public.contract_events
    for select to authenticated using (auth.uid() = owner_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own contract events insert" on public.contract_events
    for insert to authenticated with check (auth.uid() = owner_id);
exception when duplicate_object then null; end $$;

create index if not exists contract_events_contract_idx on public.contract_events (contract_id, occurred_at desc);
create index if not exists contracts_request_idx on public.contracts (request_id);