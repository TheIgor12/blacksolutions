-- ===========================================================================
-- Agendamento online com mais de um servico de uma vez
--
-- Em barbearia quase ninguem faz um servico so: faz corte mais barba, ou corte
-- mais pezinho. Antes, o cliente precisava marcar tres vezes, e entre uma marca
-- e outra o horario podia ser tomado por outra pessoa.
--
-- Esta funcao recebe a lista inteira e marca tudo em sequencia, dentro de uma
-- transacao. Ou entra tudo, ou nao entra nada. Nao ha meio agendamento.
--
-- Ela nao duplica regra nenhuma: chama a propria agendar_online uma vez por
-- servico, entao limite de horario, antecedencia, bloqueio de dia e criacao do
-- cadastro continuam sendo decididos no mesmo lugar de sempre.
--
-- p_servicos e um array json assim:
--   [{"servico":"Corte masculino","duracao":30},{"servico":"Barba","duracao":30}]
-- A duracao e a do profissional escolhido, calculada na tela, porque o mesmo
-- servico leva tempos diferentes conforme quem atende.
--
-- Pode ser executado mais de uma vez.
-- ===========================================================================

create or replace function public.agendar_online_multi(
  p_slug         text,
  p_nome         text,
  p_telefone     text,
  p_servicos     jsonb,
  p_profissional text,
  p_data         date,
  p_hora         text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_item     jsonb;
  v_minutos  int := 0;
  v_hora     time;
  v_r        json;
  v_primeiro json;
  v_feitos   jsonb := '[]'::jsonb;
  v_n        int;
begin
  if p_servicos is null or jsonb_typeof(p_servicos) <> 'array' then
    raise exception 'Informe os servicos.';
  end if;

  v_n := jsonb_array_length(p_servicos);
  if v_n = 0 then
    raise exception 'Escolha pelo menos um servico.';
  end if;
  -- Trava simples contra abuso: ninguem marca doze servicos de uma vez.
  if v_n > 6 then
    raise exception 'Escolha no maximo seis servicos de uma vez.';
  end if;

  v_hora := p_hora::time;

  for v_item in select * from jsonb_array_elements(p_servicos)
  loop
    v_r := public.agendar_online(
      p_slug,
      p_nome,
      p_telefone,
      coalesce(v_item->>'servico', ''),
      coalesce(p_profissional, ''),
      p_data,
      to_char(v_hora + make_interval(mins => v_minutos), 'HH24:MI')
    );

    if v_primeiro is null then
      v_primeiro := v_r;
    end if;

    v_feitos := v_feitos || jsonb_build_object(
      'servico', coalesce(v_item->>'servico', ''),
      'hora',    to_char(v_hora + make_interval(mins => v_minutos), 'HH24:MI')
    );

    v_minutos := v_minutos + greatest(5, coalesce((v_item->>'duracao')::int, 30));
  end loop;

  return (v_primeiro::jsonb
          || jsonb_build_object(
               'itens',    v_feitos,
               'hora',     p_hora,
               'duracao',  v_minutos,
               'termina',  to_char(v_hora + make_interval(mins => v_minutos), 'HH24:MI')
             ))::json;
end $$;

revoke all on function public.agendar_online_multi(text,text,text,jsonb,text,date,text) from public;
grant execute on function public.agendar_online_multi(text,text,text,jsonb,text,date,text) to anon, authenticated;

comment on function public.agendar_online_multi(text,text,text,jsonb,text,date,text) is
  'Marca varios servicos em sequencia num unico agendamento online. Ou entra tudo, ou nada.';

-- Conferencia
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='agendar_online_multi')                              as funcao_criada,
  has_function_privilege('anon','public.agendar_online_multi(text,text,text,jsonb,text,date,text)','execute') as anon_executa;
