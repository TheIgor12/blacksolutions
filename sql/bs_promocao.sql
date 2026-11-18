-- ===========================================================================
-- Black Friday: controle dos seis meses de R$ 59,90 e volta para R$ 79,90
--
-- O problema que isto resolve: a oferta promete seis meses por R$ 59,90 e
-- depois o valor normal. Sem registro de quando cada cliente entrou, nao da
-- para saber quem ja cumpriu os seis meses, e o aumento vira discussao.
--
-- O que isto faz:
--   1. guarda em cada clinica o codigo da promocao, a data de entrada, a data
--      em que a promocao termina, o valor promocional e o valor de depois;
--   2. marca a promocao sozinho quando chega um pagamento no valor da oferta;
--   3. devolve ao painel a lista de quem esta na promocao, com os dias que
--      faltam, para avisar antes e nao depois;
--   4. devolve ao proprio cliente, dentro do sistema, o aviso de quando a
--      promocao dele termina. Avisar antes e exigencia de informacao clara,
--      artigo 6, inciso III, do Codigo de Defesa do Consumidor.
--
-- Importante: quem cobra e o Asaas. Este arquivo controla, avisa e registra.
-- A troca do valor cobrado no setimo mes continua sendo um ato no Asaas.
--
-- Rode depois de sql/bs_asaas.sql. Pode ser executado mais de uma vez.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Onde a promocao de cada cliente fica guardada
-- ---------------------------------------------------------------------------

alter table public.clinicas
  add column if not exists promocao          text    not null default '',
  add column if not exists promocao_inicio   date,
  add column if not exists promocao_fim      date,
  add column if not exists promocao_valor    numeric,
  add column if not exists promocao_depois   numeric,
  add column if not exists promocao_avisada  date;

create index if not exists clinicas_promocao_fim on public.clinicas (promocao_fim)
  where promocao <> '';

comment on column public.clinicas.promocao is
  'Codigo da promocao em que o cliente entrou, por exemplo BF2026. Vazio quando o cliente paga o valor normal.';
comment on column public.clinicas.promocao_fim is
  'Ultimo dia com o valor promocional. Do dia seguinte em diante vale o valor normal.';
comment on column public.clinicas.promocao_avisada is
  'Dia em que o cliente foi avisado dentro do sistema de que a promocao esta acabando.';

-- ---------------------------------------------------------------------------
-- 2. Reconhecer um pagamento da promocao
--    Vale pelo valor recebido ou pela descricao da cobranca no Asaas.
-- ---------------------------------------------------------------------------

create or replace function public.bs_e_promocao(p_valor numeric, p_descricao text default '')
returns boolean
language sql
immutable
as $$
  select coalesce(p_valor,0) >= 55 and coalesce(p_valor,0) < 70
         or lower(coalesce(p_descricao,'')) like '%black%'
         or lower(coalesce(p_descricao,'')) like '%friday%'
$$;

-- ---------------------------------------------------------------------------
-- 3. Marcar a promocao de um cliente
--    Nao sobrescreve uma promocao ja marcada: a contagem dos seis meses comeca
--    no primeiro pagamento e nao recomeca a cada mes pago.
-- ---------------------------------------------------------------------------

create or replace function public.bs_promocao_marcar(
  p_clinica uuid,
  p_codigo  text    default 'BF2026',
  p_inicio  date    default current_date,
  p_meses   int     default 6,
  p_valor   numeric default 59.90,
  p_depois  numeric default 79.90,
  p_forcar  boolean default false
)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare v_fim date;
begin
  update public.clinicas
     set promocao        = p_codigo,
         promocao_inicio = p_inicio,
         promocao_fim    = (p_inicio + (coalesce(p_meses,6) || ' months')::interval)::date - 1,
         promocao_valor  = p_valor,
         promocao_depois = p_depois
   where id = p_clinica
     and (p_forcar or coalesce(promocao,'') = '')
  returning promocao_fim into v_fim;

  if v_fim is null then
    select promocao_fim into v_fim from public.clinicas where id = p_clinica;
  end if;
  return v_fim;
end $$;

revoke all on function public.bs_promocao_marcar(uuid,text,date,int,numeric,numeric,boolean) from public, anon;
grant execute on function public.bs_promocao_marcar(uuid,text,date,int,numeric,numeric,boolean) to authenticated;

-- Tirar alguem da promocao, quando o cliente sai ou quando a marcacao foi
-- feita por engano.
create or replace function public.bs_promocao_remover(p_clinica uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o login mestre.';
  end if;
  update public.clinicas
     set promocao = '', promocao_inicio = null, promocao_fim = null,
         promocao_valor = null, promocao_depois = null, promocao_avisada = null
   where id = p_clinica;
  return found;
end $$;

revoke all on function public.bs_promocao_remover(uuid) from public, anon;
grant execute on function public.bs_promocao_remover(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. O gatilho: todo pagamento no valor da oferta marca a promocao
--    Vale para o pagamento que chega sozinho pelo Asaas e para o que voce
--    vincula na mao, no painel.
-- ---------------------------------------------------------------------------

create or replace function public.bs_promocao_do_pagamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.clinica_id is not null
     and new.aplicado
     and public.bs_e_promocao(new.valor, new.descricao) then
    perform public.bs_promocao_marcar(new.clinica_id, 'BF2026',
                                      coalesce(new.pago_em, current_date));
  end if;
  return new;
end $$;

drop trigger if exists bs_pagamentos_promocao on public.bs_pagamentos;
create trigger bs_pagamentos_promocao
  after insert or update of clinica_id, aplicado on public.bs_pagamentos
  for each row execute function public.bs_promocao_do_pagamento();

-- ---------------------------------------------------------------------------
-- 5. A lista para o painel
-- ---------------------------------------------------------------------------

create or replace function public.bs_promocao_painel()
returns table (
  id uuid, nome text, email text, codigo text,
  inicio date, fim date, dias int, situacao text,
  valor numeric, depois numeric, plano text, valido_ate date
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id,
         c.nome,
         coalesce(m.email,''),
         c.promocao,
         c.promocao_inicio,
         c.promocao_fim,
         (c.promocao_fim - current_date)::int,
         case
           when c.promocao_fim is null                      then 'sem data'
           when c.promocao_fim <  current_date              then 'terminou'
           when c.promocao_fim <= current_date + 15         then 'termina em breve'
           else 'em andamento'
         end,
         c.promocao_valor,
         c.promocao_depois,
         coalesce(nullif(c.plano,''),'teste'),
         c.valido_ate
    from public.clinicas c
    left join public.membros m on m.clinica_id = c.id and m.papel = 'admin'
   where public.lm_e_mestre()
     and coalesce(c.promocao,'') <> ''
   order by c.promocao_fim nulls last
$$;

grant execute on function public.bs_promocao_painel() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. O aviso que o proprio cliente ve dentro do sistema
--    Devolve apenas a promocao da clinica de quem esta pedindo.
-- ---------------------------------------------------------------------------

create or replace function public.bs_promocao_minha()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_cl uuid; c record; v_dias int;
begin
  if auth.uid() is null then
    return json_build_object('tem', false);
  end if;

  select m.clinica_id into v_cl
    from public.membros m
   where m.user_id = auth.uid()
   order by case when m.papel = 'admin' then 0 else 1 end
   limit 1;

  if v_cl is null then
    return json_build_object('tem', false);
  end if;

  select promocao, promocao_inicio, promocao_fim, promocao_valor, promocao_depois
    into c
    from public.clinicas where id = v_cl;

  if coalesce(c.promocao,'') = '' or c.promocao_fim is null then
    return json_build_object('tem', false);
  end if;

  v_dias := (c.promocao_fim - current_date)::int;

  return json_build_object(
    'tem',     true,
    'codigo',  c.promocao,
    'inicio',  c.promocao_inicio,
    'fim',     c.promocao_fim,
    'dias',    v_dias,
    'valor',   c.promocao_valor,
    'depois',  c.promocao_depois,
    'acabou',  v_dias < 0
  );
end $$;

revoke all on function public.bs_promocao_minha() from public, anon;
grant execute on function public.bs_promocao_minha() to authenticated;

-- Registrar que o cliente ja viu o aviso, para nao repetir todo dia.
create or replace function public.bs_promocao_vista()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_cl uuid;
begin
  if auth.uid() is null then return false; end if;
  select m.clinica_id into v_cl
    from public.membros m
   where m.user_id = auth.uid()
   order by case when m.papel = 'admin' then 0 else 1 end
   limit 1;
  if v_cl is null then return false; end if;
  update public.clinicas set promocao_avisada = current_date where id = v_cl;
  return true;
end $$;

revoke all on function public.bs_promocao_vista() from public, anon;
grant execute on function public.bs_promocao_vista() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Conferencia no fim
-- ---------------------------------------------------------------------------

select
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='clinicas'
      and column_name in ('promocao','promocao_inicio','promocao_fim',
                          'promocao_valor','promocao_depois','promocao_avisada')) as colunas_criadas,
  (select count(*) from pg_trigger
    where tgname='bs_pagamentos_promocao' and not tgisinternal)                   as gatilho_criado,
  public.bs_e_promocao(59.90,'')                                                  as reconhece_59_90,
  public.bs_e_promocao(79.90,'')                                                  as reconhece_79_90_errado,
  public.bs_e_promocao(29.90,'BlackFriday')                                       as reconhece_pela_descricao,
  (select count(*) from public.clinicas where coalesce(promocao,'') <> '')        as clientes_na_promocao;
