-- ============================================================================
-- BlackSolutions: recebimento automatico dos avisos de pagamento do Asaas
--
-- O que isto resolve: hoje, quando alguem paga, nada acontece sozinho. Voce
-- precisa ver no Asaas e liberar o plano na mao, dentro do banco. Fora do seu
-- horario, a pessoa paga e fica sem sistema.
--
-- O que isto faz: cria um endereco que o Asaas chama a cada pagamento
-- confirmado. O aviso fica registrado, e quando da para saber de quem e o
-- pagamento, o plano e liberado na hora. Quando nao da, o pagamento aparece no
-- painel esperando um clique seu, em vez de ficar invisivel.
--
-- Rode depois de sql/bs_painel.sql. Pode ser executado mais de uma vez.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Registro de tudo que o Asaas avisar
-- ---------------------------------------------------------------------------

create table if not exists public.bs_pagamentos (
  id            bigserial primary key,
  evento        text not null default '',
  pagamento_id  text not null default '',
  valor         numeric not null default 0,
  pago_em       date,
  nome          text not null default '',
  email         text not null default '',
  documento     text not null default '',
  referencia    text not null default '',
  descricao     text not null default '',
  clinica_id    uuid references public.clinicas(id) on delete set null,
  aplicado      boolean not null default false,
  observacao    text not null default '',
  payload       jsonb not null default '{}'::jsonb,
  recebido_em   timestamptz not null default now()
);
create unique index if not exists bs_pagamentos_unico
  on public.bs_pagamentos (pagamento_id, evento) where pagamento_id <> '';
create index if not exists bs_pagamentos_quando on public.bs_pagamentos (recebido_em desc);

-- Quanto tempo cada pagamento concede, pelo valor recebido.
create or replace function public.bs_plano_do_valor(p_valor numeric)
returns text
language sql
immutable
as $$
  select case
           when p_valor >= 70 then 'completo'
           when p_valor >= 45 then 'completo'   -- complemento de upgrade
           when p_valor >= 25 then 'agenda'
           else ''
         end
$$;

-- ---------------------------------------------------------------------------
-- 2. O endereco que o Asaas chama
--    Confere o token que vem no cabecalho. Sem token certo, nao faz nada.
-- ---------------------------------------------------------------------------

create or replace function public.bs_asaas(evento jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_esperado text;
  v_ev text;
  v_pg jsonb;
  v_id text; v_valor numeric; v_data date;
  v_nome text; v_email text; v_doc text; v_ref text; v_desc text;
  v_cl uuid; v_plano text; v_dias int; v_ate date;
begin
  -- token combinado, guardado em bs_config
  begin
    v_token := coalesce(current_setting('request.headers', true)::json->>'asaas-access-token','');
  exception when others then v_token := '';
  end;
  select valor into v_esperado from public.bs_config where chave = 'asaas_token';
  if coalesce(v_esperado,'') = '' or v_token <> v_esperado then
    return jsonb_build_object('ok', false, 'motivo', 'token');
  end if;

  v_ev := coalesce(evento->>'event','');
  v_pg := coalesce(evento->'payment', '{}'::jsonb);
  v_id := coalesce(v_pg->>'id','');
  v_valor := coalesce(nullif(v_pg->>'value','')::numeric, 0);
  v_data := coalesce(nullif(v_pg->>'paymentDate','')::date, current_date);
  v_ref  := coalesce(v_pg->>'externalReference','');
  v_desc := coalesce(v_pg->>'description','');

  -- o Asaas manda o cliente de formas diferentes conforme a configuracao
  v_nome  := coalesce(v_pg#>>'{customer,name}', evento#>>'{customer,name}', '');
  v_email := lower(coalesce(v_pg#>>'{customer,email}', evento#>>'{customer,email}', ''));
  v_doc   := regexp_replace(coalesce(v_pg#>>'{customer,cpfCnpj}', evento#>>'{customer,cpfCnpj}', ''), '\D', '', 'g');

  -- so interessa pagamento confirmado ou recebido
  if v_ev not in ('PAYMENT_CONFIRMED','PAYMENT_RECEIVED') then
    insert into public.bs_pagamentos (evento,pagamento_id,valor,pago_em,nome,email,documento,referencia,descricao,payload,observacao)
         values (v_ev,v_id,v_valor,v_data,v_nome,v_email,v_doc,v_ref,v_desc,evento,'evento ignorado')
    on conflict do nothing;
    return jsonb_build_object('ok', true, 'acao', 'ignorado');
  end if;

  -- de quem e: primeiro pela referencia externa, depois pelo e-mail de quem pagou
  if v_ref <> '' then
    begin
      select id into v_cl from public.clinicas where id = v_ref::uuid;
    exception when others then v_cl := null;
    end;
  end if;

  if v_cl is null and v_email <> '' then
    select m.clinica_id into v_cl
      from public.membros m
     where lower(m.email) = v_email
     order by case when m.papel = 'admin' then 0 else 1 end
     limit 1;
  end if;

  v_plano := public.bs_plano_do_valor(v_valor);
  v_dias  := 30;

  if v_cl is not null and v_plano <> '' then
    update public.clinicas
       set plano = v_plano,
           valido_ate = greatest(current_date, coalesce(valido_ate, current_date)) + v_dias,
           ativa = true
     where id = v_cl
    returning valido_ate into v_ate;

    insert into public.bs_pagamentos (evento,pagamento_id,valor,pago_em,nome,email,documento,referencia,descricao,clinica_id,aplicado,payload,observacao)
         values (v_ev,v_id,v_valor,v_data,v_nome,v_email,v_doc,v_ref,v_desc,v_cl,true,evento,'plano '||v_plano||' liberado ate '||v_ate)
    on conflict do nothing;
    -- se o mesmo aviso ja tinha chegado antes, marca o que ficou registrado
    update public.bs_pagamentos
       set clinica_id = v_cl, aplicado = true,
           observacao = 'plano '||v_plano||' liberado ate '||v_ate
     where pagamento_id = v_id and evento = v_ev and v_id <> '';

    return jsonb_build_object('ok', true, 'acao', 'liberado', 'valido_ate', v_ate);
  end if;

  insert into public.bs_pagamentos (evento,pagamento_id,valor,pago_em,nome,email,documento,referencia,descricao,payload,observacao)
       values (v_ev,v_id,v_valor,v_data,v_nome,v_email,v_doc,v_ref,v_desc,evento,
               case when v_plano = '' then 'valor nao corresponde a nenhum plano' else 'nao identifiquei de quem e o pagamento' end)
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'acao', 'pendente');
end $$;

revoke all on function public.bs_asaas(jsonb) from public;
grant execute on function public.bs_asaas(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Pagamentos esperando voce, e o botao de vincular
-- ---------------------------------------------------------------------------

create or replace function public.bs_pagamentos_pendentes()
returns table (id bigint, recebido_em timestamptz, valor numeric, nome text, email text, documento text, descricao text, observacao text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.recebido_em, p.valor, p.nome, p.email, p.documento, p.descricao, p.observacao
    from public.bs_pagamentos p
   where public.lm_e_mestre() and not p.aplicado
     and p.evento in ('PAYMENT_CONFIRMED','PAYMENT_RECEIVED')
   order by p.recebido_em desc
$$;

create or replace function public.bs_vincular_pagamento(p_pagamento bigint, p_clinica uuid, p_dias int default 30)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare v_valor numeric; v_plano text; v_ate date;
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o login mestre.';
  end if;
  select valor into v_valor from public.bs_pagamentos where id = p_pagamento;
  if v_valor is null then
    raise exception 'Pagamento nao encontrado.';
  end if;
  v_plano := coalesce(nullif(public.bs_plano_do_valor(v_valor),''),'completo');

  update public.clinicas
     set plano = v_plano,
         valido_ate = greatest(current_date, coalesce(valido_ate, current_date)) + coalesce(p_dias,30),
         ativa = true
   where id = p_clinica
  returning valido_ate into v_ate;

  update public.bs_pagamentos
     set clinica_id = p_clinica, aplicado = true,
         observacao = 'vinculado por voce em '||to_char(now(),'DD/MM/YYYY')||', plano '||v_plano||' ate '||v_ate
   where id = p_pagamento;

  return v_ate;
end $$;

grant execute on function public.bs_pagamentos_pendentes() to authenticated;
grant execute on function public.bs_vincular_pagamento(bigint,uuid,int) to authenticated;

alter table public.bs_pagamentos enable row level security;
drop policy if exists bs_pagamentos_ler on public.bs_pagamentos;
create policy bs_pagamentos_ler on public.bs_pagamentos
  for select to authenticated using (public.lm_e_mestre());
revoke all on public.bs_pagamentos from anon;
grant select on public.bs_pagamentos to authenticated;

-- ---------------------------------------------------------------------------
-- 4. O que voce precisa fazer depois de rodar este arquivo
-- ---------------------------------------------------------------------------
-- 4.1 Escolha uma senha longa e aleatoria e grave como token, trocando o texto:
--     insert into public.bs_config (chave, valor) values ('asaas_token','TROQUE_POR_UMA_SENHA_LONGA')
--     on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
--
-- 4.2 No Asaas, em Integracoes, Webhooks, cadastre:
--     URL:     https://blszdbjpxgtloblxlusr.supabase.co/rest/v1/rpc/bs_asaas
--     Token:   a mesma senha do item 4.1 (o Asaas envia no cabecalho asaas-access-token)
--     Eventos: Cobranca confirmada e Cobranca recebida
--     Cabecalhos adicionais, se o Asaas permitir:
--       apikey: a chave publica anon do projeto
--       Content-Profile: public
--
-- 4.3 Confira depois do primeiro pagamento:
--     select * from public.bs_pagamentos order by recebido_em desc limit 20;
--     select * from public.bs_pagamentos_pendentes();
