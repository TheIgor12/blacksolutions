-- CANDIDATO LOCAL: exige bf_acessos_prontuario_20261125 antes.
-- Não inscreve termos, não aprova consentimentos e não recebe fotos.
-- Sem adaptador real de evidência, toda geração permanece bloqueada.
begin;

alter table public.bf_acessos_prontuario
  add column if not exists evento text not null default 'abertura',
  add column if not exists geracao_id uuid,
  add column if not exists evidencia_consentimento uuid;

alter table public.bf_acessos_prontuario drop constraint if exists bf_acesso_tipo_geracao;
alter table public.bf_acessos_prontuario add constraint bf_acesso_tipo_geracao check (
  (evento='abertura' and geracao_id is null and evidencia_consentimento is null)
  or
  (evento='geracao_simulacao' and tela='estetmapa' and geracao_id is not null and evidencia_consentimento is not null)
);
create unique index if not exists bf_acesso_geracao_id_idx
  on public.bf_acessos_prontuario (geracao_id)
  where geracao_id is not null;

-- Esse adaptador deliberadamente nunca considera evidência aprovada.
-- A migração de integração deverá substituí-lo somente por verificação real,
-- preservando a assinatura e as permissões abaixo. Nenhum cliente ganha execução.
-- A criação condicional evita reinicializar uma implementação confiável posterior.
do $$
begin
  if pg_catalog.to_regprocedure('bf_auditoria_interna.evidencia_ciencia_simulacao(uuid,uuid,text,text)') is null then
    execute $ddl$
      create function bf_auditoria_interna.evidencia_ciencia_simulacao(uuid,uuid,text,text)
      returns uuid language sql stable security invoker set search_path='' as
      'select null::uuid'
    $ddl$;
  end if;
end $$;
revoke all on function bf_auditoria_interna.evidencia_ciencia_simulacao(uuid,uuid,text,text)
  from public,anon,authenticated;

create or replace function bf_auditoria_interna.autorizar_geracao_simulacao(
  p_clinica uuid,p_prontuario uuid,p_requisicao uuid
) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  v_usuario uuid := auth.uid();
  v_paciente text;
  v_evidencia uuid;
  v_id uuid;
begin
  -- O chamador não fornece paciente, autor, horário, consentimento, hash ou imagem.
  if v_usuario is null or p_clinica is null or p_prontuario is null or p_requisicao is null
     or public.clinica_liberada(p_clinica) is distinct from true
     or public.bf_e_clinico(p_clinica) is distinct from true then
    raise exception 'Não foi possível autorizar a geração.' using errcode='42501';
  end if;

  select p.paciente_ref into v_paciente
  from public.bf_prontuarios p
  where p.id=p_prontuario and p.clinica_id=p_clinica and p.segmento='biomedicina'
    and exists(select 1 from public.bf_profissionais a
        where a.clinica_id=p_clinica and a.user_id=v_usuario and a.segmento='biomedicina' and a.ativo)
  for share;
  if not found or nullif(pg_catalog.btrim(v_paciente),'') is null then
    raise exception 'Não foi possível autorizar a geração.' using errcode='42501';
  end if;

  -- Retorna referência interna e opaca, só após verificação da evidência real.
  v_evidencia := bf_auditoria_interna.evidencia_ciencia_simulacao(p_clinica,p_prontuario,v_paciente,
    'bf-ciencia-simulacao-ilustrativa-v1');
  if v_evidencia is null then
    raise exception 'Termo de ciência ainda não verificado para este prontuário.' using errcode='42501';
  end if;

  insert into public.bf_acessos_prontuario (clinica_id,prontuario_id,paciente_ref,usuario_id,tela,evento,geracao_id,evidencia_consentimento)
  values(p_clinica,p_prontuario,v_paciente,v_usuario,'estetmapa','geracao_simulacao',p_requisicao,v_evidencia)
  on conflict (geracao_id) where geracao_id is not null do nothing
  returning geracao_id into v_id;

  -- Repetição por perda de resposta não cria 2 eventos. Novo pedido exige chave nova.
  -- Uma chave alheia nunca devolve sucesso e cada tentativa revalida o consentimento.
  if v_id is null then
    select geracao_id into v_id from public.bf_acessos_prontuario a
    where a.geracao_id=p_requisicao and a.clinica_id=p_clinica and a.prontuario_id=p_prontuario
      and a.usuario_id=v_usuario and a.paciente_ref=v_paciente and a.evidencia_consentimento=v_evidencia
      and a.evento='geracao_simulacao';
  end if;
  if v_id is null then
    raise exception 'Não foi possível autorizar a geração.' using errcode='42501';
  end if;
  return v_id;
end
$$;
revoke all on function bf_auditoria_interna.autorizar_geracao_simulacao(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function bf_auditoria_interna.autorizar_geracao_simulacao(uuid,uuid,uuid) to authenticated;

create or replace function public.bf_autorizar_geracao_simulacao(
  p_clinica uuid,p_prontuario uuid,p_requisicao uuid
) returns uuid
language sql security invoker set search_path='' as $$
  select bf_auditoria_interna.autorizar_geracao_simulacao(p_clinica,p_prontuario,p_requisicao)
$$;
revoke all on function public.bf_autorizar_geracao_simulacao(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.bf_autorizar_geracao_simulacao(uuid,uuid,uuid) to authenticated;

commit;
select 'CONFERENCIA=' || count(*) from pg_catalog.pg_proc
  where oid='public.bf_autorizar_geracao_simulacao(uuid,uuid,uuid)'::regprocedure;
