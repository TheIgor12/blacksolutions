-- ===========================================================================
-- Trava do segmento
--
-- O preco do sistema muda conforme o ramo. Sem trava, quem assina o ramo mais
-- barato troca para outro dentro do sistema e passa a usar modulos de um plano
-- que nao pagou. A trava no navegador nao resolve isso: qualquer pessoa com o
-- console do navegador aberto muda o que quiser na tela. Quem decide precisa
-- ser o servidor.
--
-- Como funciona:
--   1. a coluna segmento da clinica guarda o ramo contratado;
--   2. bs_segmento_definir grava o ramo UMA vez, na criacao da conta, e recusa
--      qualquer troca depois;
--   3. bs_segmento_trocar troca o ramo, mas so para o login mestre, que e o
--      caminho do suporte quando a pessoa escolheu errado;
--   4. o aplicativo le o ramo da nuvem e ignora o que estiver gravado no
--      aparelho, entao mexer no navegador nao muda nada.
--
-- Trocar de plano continua livre: completo e so agenda sao a mesma coisa em
-- ramos diferentes, e a pessoa pode subir ou descer quando quiser.
--
-- Pode ser executado mais de uma vez.
-- ===========================================================================

alter table public.clinicas
  add column if not exists segmento        text not null default '',
  add column if not exists segmento_em     timestamptz,
  add column if not exists segmento_trocas int not null default 0;

comment on column public.clinicas.segmento is
  'Ramo contratado: podologia, estetica, beleza ou barbearia. Define os modulos e o preco. So o login mestre troca.';

-- ---------------------------------------------------------------------------
-- Define o ramo uma unica vez. Chamada pelo proprio aplicativo na criacao.
-- ---------------------------------------------------------------------------
create or replace function public.bs_segmento_definir(p_segmento text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_cl uuid; v_atual text;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta primeiro.';
  end if;

  if p_segmento not in ('podologia','estetica','beleza','barbearia') then
    raise exception 'Ramo desconhecido.';
  end if;

  select m.clinica_id into v_cl
    from public.membros m
   where m.user_id = auth.uid()
   order by case when m.papel = 'admin' then 0 else 1 end
   limit 1;

  if v_cl is null then
    raise exception 'Conta sem clinica.';
  end if;

  select coalesce(segmento,'') into v_atual from public.clinicas where id = v_cl;

  if v_atual <> '' then
    -- Ja existe ramo. Nao e erro: o aplicativo chama isto a cada entrada.
    return json_build_object('segmento', v_atual, 'definido', false, 'travado', true);
  end if;

  update public.clinicas
     set segmento = p_segmento, segmento_em = now()
   where id = v_cl;

  return json_build_object('segmento', p_segmento, 'definido', true, 'travado', true);
end $$;

revoke all on function public.bs_segmento_definir(text) from public, anon;
grant execute on function public.bs_segmento_definir(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Troca do ramo, so pelo login mestre. E o caminho do suporte.
-- ---------------------------------------------------------------------------
create or replace function public.bs_segmento_trocar(p_clinica uuid, p_segmento text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_antes text;
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o login mestre troca o ramo da clinica.';
  end if;

  if p_segmento not in ('podologia','estetica','beleza','barbearia','') then
    raise exception 'Ramo desconhecido.';
  end if;

  select coalesce(segmento,'') into v_antes from public.clinicas where id = p_clinica;
  if not found then
    raise exception 'Clinica nao encontrada.';
  end if;

  update public.clinicas
     set segmento = p_segmento,
         segmento_em = now(),
         segmento_trocas = segmento_trocas + 1
   where id = p_clinica;

  return json_build_object('antes', v_antes, 'agora', p_segmento);
end $$;

revoke all on function public.bs_segmento_trocar(uuid,text) from public, anon;
grant execute on function public.bs_segmento_trocar(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Conferencia
-- ---------------------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='clinicas'
      and column_name in ('segmento','segmento_em','segmento_trocas'))                 as colunas,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('bs_segmento_definir','bs_segmento_trocar')) as funcoes,
  has_function_privilege('authenticated','public.bs_segmento_definir(text)','execute')  as cliente_define,
  has_function_privilege('anon','public.bs_segmento_definir(text)','execute')           as anonimo_define,
  (select count(*) from public.clinicas where coalesce(segmento,'') <> '')              as clinicas_com_ramo;
