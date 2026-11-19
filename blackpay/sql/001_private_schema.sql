-- BlackPay 0.1.0 | SCHEMA DE DESENVOLVIMENTO, NÃO ATIVAR EM PRODUÇÃO.
-- Núcleo privado. Sem permissões de cliente / anon. A escrita exige backend autorizado.
begin;
create schema if not exists blackpay;
revoke all on schema blackpay from public, anon, authenticated;
create extension if not exists pgcrypto;
create table if not exists blackpay.organizations (
 id uuid primary key default gen_random_uuid(),
 legal_name text not null,
 tax_id_ciphertext bytea,
 status text not null default 'onboarding' check (status in ('onboarding','pending_compliance','approved','suspended','closed')),
 partner_organization_id text,
 created_at timestamptz not null default now()
);
create table if not exists blackpay.memberships (
 organization_id uuid not null references blackpay.organizations(id),
 user_id uuid not null references auth.users(id),
 role text not null check (role in ('owner','finance_manager','operator','auditor','support')),
 status text not null default 'active' check(status in ('active','revoked')),
 primary key (organization_id,user_id)
);
create table if not exists blackpay.counterparties (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references blackpay.organizations(id),
 display_name text not null,
 encrypted_tax_identifier bytea,
 type text not null check(type in ('person','company')),
 kyc_state text not null default 'pending' check(kyc_state in ('pending','approved','rejected','review')),
 provider_customer_id text,
 created_at timestamptz not null default now()
);
create table if not exists blackpay.accounts (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references blackpay.organizations(id),
 counterparty_id uuid references blackpay.counterparties(id),
 name text not null,
 kind text not null check(kind in ('customer','clearing','fees','settlement','reserve','chargeback')),
 currency char(3) not null default 'BRL' check(currency='BRL'),
 status text not null default 'pending' check(status in ('pending','active','blocked','closed')),
 partner_account_id text,
 created_at timestamptz not null default now(),
 unique (organization_id,id)
);
create table if not exists blackpay.operations (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references blackpay.organizations(id),
 type text not null check (type in ('internal_transfer','pix_in','pix_out','withdrawal','card_sale','card_refund','chargeback','fee','adjustment','hold','hold_release')),
 status text not null default 'created' check(status in ('created','pending_review','submitted','processing','settled','failed','cancelled','reversed')),
 amount_minor bigint not null check(amount_minor>0),
 currency char(3) not null default 'BRL' check(currency='BRL'),
 idempotency_key text not null,
 external_reference text,
 partner_id text,
 partner_end_to_end_id text,
 payer_account_id uuid,
 payee_account_id uuid,
 correlation_id uuid not null default gen_random_uuid(),
 description text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,idempotency_key),
 unique(partner_id,external_reference),
 unique(partner_id,partner_end_to_end_id),
 foreign key (organization_id,payer_account_id) references blackpay.accounts(organization_id,id),
 foreign key (organization_id,payee_account_id) references blackpay.accounts(organization_id,id)
);
create table if not exists blackpay.journal_batches (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references blackpay.organizations(id),
 operation_id uuid not null references blackpay.operations(id),
 status text not null default 'pending' check(status in ('pending','posted')),
 created_at timestamptz not null default now(),
 posted_at timestamptz,
 unique(operation_id)
);
create table if not exists blackpay.journal_entries (
 id bigint generated always as identity primary key,
 batch_id uuid not null references blackpay.journal_batches(id),
 account_id uuid not null references blackpay.accounts(id),
 amount_minor bigint not null check(amount_minor<>0),
 created_at timestamptz not null default now()
);
create index if not exists bp_journal_account_ix on blackpay.journal_entries(account_id,id);
create table if not exists blackpay.payment_requests (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references blackpay.organizations(id),
 account_id uuid not null references blackpay.accounts(id),
 amount_minor bigint not null check(amount_minor>0),
 provider_charge_id text,
 txid text,
 payload_hash text,
 reference text not null,
 status text not null default 'created' check(status in ('created','pending','settled','expired','cancelled')),
 expires_at timestamptz,
 created_at timestamptz not null default now(),
 unique(organization_id,reference)
);
create table if not exists blackpay.terminals (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references blackpay.organizations(id),
 account_id uuid not null references blackpay.accounts(id),
 provider text,
 provider_terminal_id text,
 label text not null,
 status text not null default 'requested' check(status in ('requested','approved','active','suspended','retired')),
 created_at timestamptz not null default now(),
 unique(provider,provider_terminal_id)
);
create table if not exists blackpay.settlement_events (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references blackpay.organizations(id),
 provider text not null,
 provider_event_id text not null,
 event_type text not null,
 payload_sha256 text not null,
 signature_verified boolean not null default false,
 operation_id uuid references blackpay.operations(id),
 received_at timestamptz not null default now(),
 reconciled_at timestamptz,
 unique(provider,provider_event_id)
);
create table if not exists blackpay.risk_cases (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references blackpay.organizations(id),
 account_id uuid references blackpay.accounts(id),
 operation_id uuid references blackpay.operations(id),
 reason text not null,
 severity text not null check(severity in ('low','medium','high','critical')),
 status text not null default 'open' check(status in ('open','investigating','resolved','reported')),
 created_at timestamptz not null default now()
);
create table if not exists blackpay.audit_events (
 id bigint generated always as identity primary key,
 organization_id uuid references blackpay.organizations(id),
 event_name text not null,
 subject text,
 actor_id uuid,
 correlation_id uuid,
 metadata jsonb not null default '{}'::jsonb,
 previous_hash text,
 event_hash text not null,
 created_at timestamptz not null default now()
);
create table if not exists blackpay.ledger_controls (
 organization_id uuid primary key references blackpay.organizations(id),
 ledger_enabled boolean not null default false,
 real_money_enabled boolean not null default false check(real_money_enabled=false),
 provider_verified boolean not null default false,
 regulatory_approval_verified boolean not null default false,
 modified_at timestamptz not null default now()
);
-- Defesa em profundidade. Não há políticas permissivas nem APIs abertas.
alter table blackpay.organizations enable row level security;
alter table blackpay.memberships enable row level security;
alter table blackpay.counterparties enable row level security;
alter table blackpay.accounts enable row level security;
alter table blackpay.operations enable row level security;
alter table blackpay.journal_batches enable row level security;
alter table blackpay.journal_entries enable row level security;
alter table blackpay.payment_requests enable row level security;
alter table blackpay.terminals enable row level security;
alter table blackpay.settlement_events enable row level security;
alter table blackpay.risk_cases enable row level security;
alter table blackpay.audit_events enable row level security;
alter table blackpay.ledger_controls enable row level security;
revoke all on all tables in schema blackpay from public, anon, authenticated;
revoke all on all sequences in schema blackpay from public, anon, authenticated;
-- A imutabilidade é aplicada inclusive para escrita privilegiada via trigger.
create or replace function blackpay.prevent_ledger_mutation() returns trigger language plpgsql
set search_path = '' as $$
begin
 raise exception 'BlackPay ledger is append-only; post reversing entries instead';
end; $$;
drop trigger if exists bp_immutable_entries on blackpay.journal_entries;
create trigger bp_immutable_entries before update or delete on blackpay.journal_entries
for each row execute function blackpay.prevent_ledger_mutation();
drop trigger if exists bp_immutable_audit on blackpay.audit_events;
create trigger bp_immutable_audit before update or delete on blackpay.audit_events
for each row execute function blackpay.prevent_ledger_mutation();
create or replace function blackpay.guard_batch_posting() returns trigger language plpgsql
set search_path = '' as $$
declare total bigint; legs integer;
begin
 if old.status='posted' then raise exception 'Posted journal batch cannot be edited'; end if;
 if new.status='posted' then
   select count(*),coalesce(sum(amount_minor),0) into legs,total
   from blackpay.journal_entries where batch_id=new.id;
   if legs<2 or total<>0 then raise exception 'Unbalanced or incomplete double-entry posting'; end if;
   new.posted_at=now();
 end if;
 return new;
end; $$;
drop trigger if exists bp_guard_batches on blackpay.journal_batches;
create trigger bp_guard_batches before update on blackpay.journal_batches
for each row execute function blackpay.guard_batch_posting();
create or replace function blackpay.guard_entries() returns trigger language plpgsql
set search_path = '' as $$
declare s text; org uuid; acc_org uuid;
begin
 select status, organization_id into s,org from blackpay.journal_batches where id=new.batch_id for update;
 if s is null or s='posted' then raise exception 'Batch not writable'; end if;
 select organization_id into acc_org from blackpay.accounts where id=new.account_id;
 if acc_org is distinct from org then raise exception 'Cross-tenant ledger entry blocked'; end if;
 return new;
end; $$;
drop trigger if exists bp_guard_entries on blackpay.journal_entries;
create trigger bp_guard_entries before insert on blackpay.journal_entries
for each row execute function blackpay.guard_entries();
-- A consulta contábil não implica saldo bancário disponível.
create or replace view blackpay.ledger_balances with (security_invoker = true) as
select j.account_id,coalesce(sum(j.amount_minor),0)::bigint balance_minor
from blackpay.journal_entries j
join blackpay.journal_batches b on b.id=j.batch_id and b.status='posted'
group by j.account_id;
commit;
