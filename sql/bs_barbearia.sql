-- ===========================================================================
-- Plano Barbearia, R$ 34,90 por mes
--
-- O problema: o aviso de pagamento do Asaas decide o plano pelo valor pago.
-- Antes deste arquivo, qualquer valor entre R$ 25,00 e R$ 44,99 virava o plano
-- So agenda. Um barbeiro que pagasse R$ 34,90 ficaria travado na agenda, sem o
-- financeiro, a comanda e o caixa que ele contratou.
--
-- O que este arquivo faz:
--   1. pagamento de R$ 33,00 a R$ 44,99 passa a liberar o plano 'barbearia';
--   2. o plano 'barbearia' so vale para conta cujo ramo e barbearia. Se uma
--      conta de outro ramo pagar o link da barbearia, ela recebe o So agenda,
--      e nao o completo, porque o preco cheio do ramo dela e outro.
--
-- O aplicativo trata 'barbearia' como plano completo: qualquer valor diferente
-- de 'agenda' e de 'teste' libera tudo. Nao precisa mudar mais nada.
--
-- Rode depois de sql/bs_asaas.sql e sql/bs_segmento.sql. Pode ser executado
-- mais de uma vez.
-- ===========================================================================

create or replace function public.bs_plano_do_valor(p_valor numeric)
returns text
language sql
immutable
as $$
  select case
           when p_valor >= 70 then 'completo'
           when p_valor >= 45 then 'completo'   -- complemento de upgrade e promocao
           when p_valor >= 33 then 'barbearia'  -- plano Barbearia, R$ 34,90
           when p_valor >= 25 then 'agenda'
           else ''
         end
$$;

-- Trava: plano barbearia so para conta do ramo barbearia
create or replace function public.bs_plano_barbearia_trava()
returns trigger
language plpgsql
as $$
begin
  if new.plano = 'barbearia' and coalesce(new.segmento,'') <> 'barbearia' then
    new.plano := 'agenda';
  end if;
  return new;
end
$$;

drop trigger if exists bs_plano_barbearia_trava on public.clinicas;
create trigger bs_plano_barbearia_trava
  before insert or update of plano, segmento on public.clinicas
  for each row execute function public.bs_plano_barbearia_trava();

-- Conferencia: deve mostrar 'barbearia', 'agenda' e 'completo'
select public.bs_plano_do_valor(34.90) as barbearia,
       public.bs_plano_do_valor(29.90) as agenda,
       public.bs_plano_do_valor(79.90) as completo;
