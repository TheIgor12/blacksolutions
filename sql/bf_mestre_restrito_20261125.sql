-- Candidate only. A separate BlackFlow authorization registry; no implied legacy admin.
begin;
create schema if not exists bf_privado;
revoke all on schema bf_privado from public, anon, authenticated;
create table if not exists bf_privado.mestres (
  user_id uuid primary key references auth.users(id) on delete cascade,
  concedido_em timestamptz not null default now(),
  expira_em timestamptz,
  revogado_em timestamptz,
  check (expira_em is null or expira_em > concedido_em)
);
alter table bf_privado.mestres enable row level security;
revoke all on bf_privado.mestres from public, anon, authenticated;

-- Readiness only. An actual master RPC must enforce the same gate in its own
-- transaction before its narrowly enumerated BlackFlow operation.
create or replace function public.bf_mestre_acesso_confirmado()
returns boolean
language sql stable security definer set search_path = ''
as $$
 select coalesce(
   auth.uid() is not null
   and auth.jwt()->>'aal' = 'aal2'
   and exists (
     select 1 from bf_privado.mestres m
     where m.user_id = auth.uid() and m.revogado_em is null
       and (m.expira_em is null or m.expira_em > statement_timestamp())
   )
   and exists (
     select 1 from auth.sessions s
     join auth.mfa_factors f on f.id=s.factor_id and f.user_id=s.user_id
     where s.user_id=auth.uid() and s.id::text=auth.jwt()->>'session_id'
       and (s.not_after is null or s.not_after > statement_timestamp())
       and f.status::text='verified' and f.factor_type::text='totp'
   ),false)
$$;
revoke all on function public.bf_mestre_acesso_confirmado() from public, anon, authenticated;
grant execute on function public.bf_mestre_acesso_confirmado() to authenticated;
commit;
