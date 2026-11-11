-- BlackFlow: planos Só agenda e Completo
-- O sistema lê a coluna plano da tabela clinicas. Valores usados:
--   'teste'  = teste grátis (o cliente experimenta os dois planos)
--   'agenda' = plano Só agenda, R$ 29,90: financeiro, estoque, comanda, caixa e relatórios ficam travados
--   qualquer outro valor (por exemplo 'mensal') = plano completo
-- Rode este script uma única vez. Depois, para liberar cada cliente, use a função definir_plano.

create or replace function public.definir_plano(p_nome text, p_plano text, p_dias int default 30)
returns setof public.clinicas
language sql
security definer
set search_path = public
as $$
  update public.clinicas c
     set plano = p_plano,
         valido_ate = current_date + p_dias,
         ativa = true
   where c.nome ilike '%' || p_nome || '%'
  returning c.*;
$$;
revoke all on function public.definir_plano(text, text, int) from public, anon, authenticated;

-- Painel de clientes, com o e-mail de quem administra cada negócio
create or replace view public.painel_clientes with (security_invoker = true) as
select c.id,
       c.nome                                   as negocio,
       coalesce(nullif(c.plano,''),'teste')     as plano,
       c.valido_ate,
       (c.valido_ate - current_date)            as dias_restantes,
       c.ativa,
       (select string_agg(m.email, ', ') from public.membros m where m.clinica_id = c.id and m.papel = 'admin') as email_admin
  from public.clinicas c;
revoke all on public.painel_clientes from anon, authenticated;

-- Confere se existe alguma restrição que impeça o valor 'agenda' na coluna plano
select conname as restricao, pg_get_constraintdef(oid) as definicao
  from pg_constraint
 where conrelid = 'public.clinicas'::regclass
   and contype in ('c','f');

-- Lista dos clientes, do mais novo para o mais antigo
select * from public.painel_clientes order by valido_ate nulls first;

-- COMO USAR DEPOIS DE CADA PAGAMENTO (copie a linha, troque o nome e rode):
-- Plano Só agenda, R$ 29,90, por 30 dias:
--   select * from public.definir_plano('nome do negócio', 'agenda', 30);
-- Plano completo, R$ 79,99, por 30 dias:
--   select * from public.definir_plano('nome do negócio', 'mensal', 30);
-- Voltar alguém para o teste grátis por 14 dias:
--   select * from public.definir_plano('nome do negócio', 'teste', 14);
