-- Candidata para auditoria em homologação. Após o mapa e histórico intramuscular.
-- Usa os prontuários e evoluções nativos, sem gravar em registros ou criar tabela paralela.
begin;

create or replace function public.bf_registrar_nota_intramuscular(
  p_clinica uuid,p_prontuario uuid,p_registro uuid,p_paciente_ref text,p_destino text,p_texto text,p_requisicao uuid
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  autor uuid := auth.uid();
  texto text := pg_catalog.btrim(p_texto);
  conteudo_evolucao text;
begin
  if autor is null or p_clinica is null or p_prontuario is null or p_registro is null or p_requisicao is null
    or p_paciente_ref is null or pg_catalog.length(pg_catalog.btrim(p_paciente_ref)) not between 1 and 200
    or p_destino is distinct from 'evolucao'
    or texto is null or pg_catalog.length(texto) not between 1 and 2500 then
    raise exception 'Revise os dados da nota.' using errcode='22023';
  end if;
  if not public.clinica_liberada(p_clinica) or not public.bf_e_clinico(p_clinica)
    or not exists (select 1 from public.bf_profissionais p where p.clinica_id=p_clinica
      and p.user_id=autor and p.segmento='biomedicina' and p.ativo) then
    raise exception 'Não foi possível confirmar o acesso clínico.' using errcode='42501';
  end if;

  perform 1 from public.bf_prontuarios p
    where p.id=p_prontuario and p.clinica_id=p_clinica and p.segmento='biomedicina'
      and p.paciente_ref=p_paciente_ref for update;
  if not found or not exists (
    select 1 from public.bf_estetmapa_registros r where r.id=p_registro and r.clinica_id=p_clinica
      and r.prontuario_id=p_prontuario and r.tipo_registro='intramuscular_realizada'
  ) then
    raise exception 'Não foi possível confirmar o vínculo clínico.' using errcode='42501';
  end if;

  -- Tag da origem permanece vinculada à nota e torna única a repetição da requisição.
  conteudo_evolucao := texto || E'\n\n' || 'Registro de origem: ' || p_registro::text;
  insert into public.bf_evolucoes(id,clinica_id,prontuario_id,conteudo,profissional_id)
    values(p_requisicao,p_clinica,p_prontuario,conteudo_evolucao,autor) on conflict(id) do nothing;
  if not found and not exists(select 1 from public.bf_evolucoes e
    where e.id=p_requisicao and e.clinica_id=p_clinica and e.prontuario_id=p_prontuario
      and e.profissional_id=autor and e.conteudo=conteudo_evolucao) then
    raise exception 'Não foi possível confirmar a nota.' using errcode='22023';
  end if;
  return true;
end
$$;
alter function public.bf_registrar_nota_intramuscular(uuid,uuid,uuid,text,text,text,uuid) owner to postgres;
revoke all on function public.bf_registrar_nota_intramuscular(uuid,uuid,uuid,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.bf_registrar_nota_intramuscular(uuid,uuid,uuid,text,text,text,uuid) to authenticated;

commit;
select 'CONFERENCIA=' || count(*) from pg_catalog.pg_proc
  where oid='public.bf_registrar_nota_intramuscular(uuid,uuid,uuid,text,text,text,uuid)'::regprocedure and prosecdef;
