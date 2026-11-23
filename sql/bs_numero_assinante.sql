-- ===========================================================================
-- Numero do assinante
--
-- A campanha promete condicao aos cem primeiros. Hoje esse controle e feito
-- na mao, o que e risco de publicidade enganosa pelo artigo 37, paragrafo
-- primeiro, do Codigo de Defesa do Consumidor: anunciar posicao sem contagem
-- real nao se sustenta.
--
-- Aqui cada clinica recebe um numero sequencial, uma unica vez, no momento
-- em que deixa de ser teste e passa a ser assinatura paga. O numero nunca
-- muda, nunca se repete e nao volta a ser usado se a clinica cancelar, para
-- que a posicao dita ao cliente continue verdadeira depois.
--
-- Pode ser executado mais de uma vez.
-- ===========================================================================

alter table public.clinicas
  add column if not exists assinante_num  int,
  add column if not exists assinante_em   timestamptz;

create unique index if not exists clinicas_assinante_num_uk
  on public.clinicas(assinante_num) where assinante_num is not null;

comment on column public.clinicas.assinante_num is
  'Posicao do assinante na ordem de contratacao. Atribuida uma unica vez, nunca reaproveitada.';

-- ---------------------------------------------------------------------------
-- Atribui o numero. Chamada pelo gatilho de pagamento e pelo painel.
-- ---------------------------------------------------------------------------
create or replace function public.bs_assinante_numerar(p_clinica uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_num int; v_plano text;
begin
  select assinante_num, coalesce(nullif(plano,''),'teste')
    into v_num, v_plano
    from public.clinicas where id = p_clinica for update;

  if not found then
    raise exception 'Clinica nao encontrada.';
  end if;
  if v_num is not null then
    return v_num;                      -- ja tem numero, nao mexe
  end if;
  if v_plano in ('teste','') then
    return null;                       -- so numera quem virou assinante
  end if;

  select coalesce(max(assinante_num), 0) + 1 into v_num from public.clinicas;
  update public.clinicas
     set assinante_num = v_num, assinante_em = now()
   where id = p_clinica;
  return v_num;
end $$;

revoke all on function public.bs_assinante_numerar(uuid) from public, anon;
grant execute on function public.bs_assinante_numerar(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- O que o aplicativo le para mostrar "Assinante no 25 de 100"
-- ---------------------------------------------------------------------------
create or replace function public.bs_assinante_meu()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_cl uuid; v_num int; v_em timestamptz; v_total int; v_plano text;
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

  select assinante_num, assinante_em, coalesce(nullif(plano,''),'teste')
    into v_num, v_em, v_plano
    from public.clinicas where id = v_cl;

  select count(*) into v_total from public.clinicas where assinante_num is not null;

  return json_build_object(
    'tem',     v_num is not null,
    'numero',  v_num,
    'desde',   v_em,
    'total',   v_total,
    'plano',   v_plano,
    'cem_primeiros', coalesce(v_num, 999999) <= 100
  );
end $$;

revoke all on function public.bs_assinante_meu() from public, anon;
grant execute on function public.bs_assinante_meu() to authenticated;

-- ---------------------------------------------------------------------------
-- Quantas vagas da campanha ainda existem, para a pagina publica.
-- Devolve so o numero, nunca dado de clinica.
-- ---------------------------------------------------------------------------
create or replace function public.bs_vagas_campanha()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'ocupadas', (select count(*) from public.clinicas where assinante_num is not null and assinante_num <= 100),
    'total',    100,
    'restantes', greatest(0, 100 - (select count(*) from public.clinicas where assinante_num is not null and assinante_num <= 100))
  )
$$;

grant execute on function public.bs_vagas_campanha() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Numera quem ja e assinante hoje, na ordem em que a conta foi criada.
-- ---------------------------------------------------------------------------
do $$
declare r record; v_num int;
begin
  select coalesce(max(assinante_num), 0) into v_num from public.clinicas;
  for r in
    select c.id
      from public.clinicas c
      left join auth.users u on u.id = (select m.user_id from public.membros m
                                         where m.clinica_id = c.id and m.papel = 'admin' limit 1)
     where c.assinante_num is null
       and coalesce(nullif(c.plano,''),'teste') not in ('teste','')
     order by u.created_at nulls last, c.id
  loop
    v_num := v_num + 1;
    update public.clinicas set assinante_num = v_num, assinante_em = now() where id = r.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- O painel passa a enxergar a posicao de cada conta.
-- ---------------------------------------------------------------------------
drop function if exists public.bs_painel_contas();
create or replace function public.bs_painel_contas()
returns table (
  sistema text, nome text, email text, papel text,
  plano text, valido_ate date, dias_restantes int, criado_em timestamptz,
  pedido_prazo timestamptz, id uuid, segmento text, assinante_num int
)
language sql
stable
security definer
set search_path = public
as $$
  select 'BlackFlow'::text, c.nome, coalesce(m.email,u.email,''), coalesce(m.papel,''),
         coalesce(nullif(c.plano,''),'teste'), c.valido_ate,
         (c.valido_ate - current_date)::int, u.created_at,
         (select max(p.pedido_em) from public.bs_prorrogacoes p where p.clinica_id = c.id and p.concedido_em is null),
         c.id, coalesce(c.segmento,''), c.assinante_num
    from public.clinicas c
    left join public.membros m on m.clinica_id = c.id and m.papel = 'admin'
    left join auth.users u on u.id = m.user_id
   where public.lm_e_mestre()
  union all
  select 'Lex Calc'::text, e.nome, coalesce(m.email,u.email,''), coalesce(m.papel,''),
         ''::text, null::date, null::int, u.created_at, null::timestamptz, e.id, ''::text, null::int
    from public.lm_escritorios e
    left join public.lm_membros m on m.escritorio_id = e.id and m.papel = 'dono'
    left join auth.users u on u.id = m.user_id
   where public.lm_e_mestre()
   order by 8 desc nulls last
$$;

grant execute on function public.bs_painel_contas() to authenticated;

-- ---------------------------------------------------------------------------
-- Conferencia
-- ---------------------------------------------------------------------------
select 'CONFERENCIA=' ||
  ' colunas:' || (select count(*) from information_schema.columns
                   where table_schema='public' and table_name='clinicas'
                     and column_name in ('assinante_num','assinante_em')) ||
  ' numeradas:' || (select count(*) from public.clinicas where assinante_num is not null) ||
  ' maior:'     || coalesce((select max(assinante_num)::text from public.clinicas), '0') ||
  ' vagas_restantes:' || ((select public.bs_vagas_campanha())->>'restantes') as r;
