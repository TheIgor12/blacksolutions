-- Candidata para auditoria. Não altera as tabelas clínicas em uso.
-- Registra uma abertura autorizada. Não copia conteúdo, nomes ou notas clínicas.
begin;
create schema if not exists bf_auditoria_interna;
revoke all on schema bf_auditoria_interna from public;
grant usage on schema bf_auditoria_interna to authenticated;

create table if not exists public.bf_acessos_prontuario (
  id bigint generated always as identity primary key,
  clinica_id uuid not null,
  prontuario_id uuid not null,
  paciente_ref text not null,
  usuario_id uuid not null,
  tela text not null check (tela in ('bfclinico','odontomapa','estetmapa')),
  aberto_em timestamptz not null default statement_timestamp()
);
alter table public.bf_acessos_prontuario enable row level security;
revoke all on public.bf_acessos_prontuario from public, anon, authenticated;
grant select on public.bf_acessos_prontuario to authenticated;
create index if not exists bf_acessos_prontuario_clinica_hora on public.bf_acessos_prontuario (clinica_id, aberto_em desc);
drop policy if exists bf_acessos_prontuario_consulta on public.bf_acessos_prontuario;
create policy bf_acessos_prontuario_consulta on public.bf_acessos_prontuario
for select to authenticated using (
  public.bf_e_clinico(clinica_id)
  and exists (select 1 from public.membros m
              where m.clinica_id = bf_acessos_prontuario.clinica_id
                and m.user_id = (select auth.uid()) and m.papel = 'admin')
);

create or replace function bf_auditoria_interna.registrar_abertura(p_clinica uuid,p_prontuario uuid,p_tela text)
returns boolean language plpgsql security definer set search_path='' as $$
declare
  v_usuario uuid := auth.uid();
  v_paciente text;
  v_segmento text;
begin
  if v_usuario is null or p_tela is null or p_tela not in ('bfclinico','odontomapa','estetmapa') then
    raise exception 'Abertura de prontuário não autorizada.' using errcode='42501';
  end if;
  if not public.bf_e_clinico(p_clinica) then
    raise exception 'Abertura de prontuário não autorizada.' using errcode='42501';
  end if;
  select p.paciente_ref,p.segmento into v_paciente,v_segmento
  from public.bf_prontuarios p
  where p.clinica_id=p_clinica and p.id=p_prontuario
    and exists (
      select 1 from public.bf_profissionais a
      where a.clinica_id=p.clinica_id and a.user_id=v_usuario and a.ativo and a.segmento=p.segmento
    );
  if not found or v_paciente is null
     or (p_tela='odontomapa' and v_segmento is distinct from 'odontologia')
     or (p_tela='estetmapa' and v_segmento is distinct from 'biomedicina') then
    raise exception 'Abertura de prontuário não autorizada.' using errcode='42501';
  end if;
  insert into public.bf_acessos_prontuario(clinica_id,prontuario_id,paciente_ref,usuario_id,tela)
  values(p_clinica,p_prontuario,v_paciente,v_usuario,p_tela);
  return true;
end;
$$;
revoke all on function bf_auditoria_interna.registrar_abertura(uuid,uuid,text) from public,anon,authenticated;
grant execute on function bf_auditoria_interna.registrar_abertura(uuid,uuid,text) to authenticated;

create or replace function public.bf_registrar_abertura_prontuario(p_clinica uuid,p_prontuario uuid,p_tela text)
returns boolean language sql security invoker set search_path='' as $$
  select bf_auditoria_interna.registrar_abertura(p_clinica,p_prontuario,p_tela);
$$;
revoke all on function public.bf_registrar_abertura_prontuario(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.bf_registrar_abertura_prontuario(uuid,uuid,text) to authenticated;
select 'CONFERENCIA=registro de abertura de prontuário; aplicar apenas após a auditoria' as resultado;
commit;
