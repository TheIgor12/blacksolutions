-- A lista privada só é abastecida pela direção, fora do repositório público.
-- Previews não concedem acesso clínico, não leem prontuário e não alteram plano.
begin;
create schema if not exists bf_privado;
revoke all on schema bf_privado from public, anon, authenticated;
create table if not exists bf_privado.clinicas_previa (
 clinica_id uuid primary key references public.clinicas(id) on delete cascade
);
alter table bf_privado.clinicas_previa enable row level security;
revoke all on bf_privado.clinicas_previa from public, anon, authenticated;

create or replace function public.bf_previa_clinica_autorizada(p_clinica uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
 select auth.uid() is not null and exists (
   select 1 from bf_privado.clinicas_previa c
   join public.clinicas cl on cl.id=c.clinica_id and cl.ativa is true and (cl.valido_ate is null or cl.valido_ate>=current_date)
   join public.membros m on m.clinica_id=c.clinica_id
   where c.clinica_id=p_clinica and m.user_id=auth.uid() and m.papel='admin'
 );
$$;
revoke all on function public.bf_previa_clinica_autorizada(uuid) from public, anon, authenticated;
grant execute on function public.bf_previa_clinica_autorizada(uuid) to authenticated;
commit;
