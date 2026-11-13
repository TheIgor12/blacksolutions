-- ---------------------------------------------------------------------------
-- BlackSolutions, identidade do responsável no cadastro
--
-- Objetivo: impedir que a mesma pessoa abra conta atrás de conta para ficar
-- eternamente no teste grátis.
--
-- O que dá para verificar de verdade:
--   CNPJ, sim. Os dados do cadastro da Receita Federal são abertos e existem
--   APIs públicas e gratuitas que os servem. O sistema consulta, confere a
--   situação cadastral e guarda a razão social que voltou.
--   CPF, não. A Receita Federal não tem API aberta de consulta de CPF. O que
--   existe é página com captcha e serviços pagos do Serpro ou de revendas. O
--   que o sistema faz com o CPF é conferir os dígitos verificadores, o que
--   prova que o número é bem formado, e não que ele existe ou é da pessoa.
--   A força do CPF aqui vem da unicidade, não da conferência.
--
-- A trava de verdade é a tabela bs_identidades. Ela guarda cada CPF e cada
-- CNPJ que já abriu teste grátis, e sobrevive à exclusão da clínica. Repetir
-- o documento não começa teste novo.
-- ---------------------------------------------------------------------------

-- 1. Só dígitos e só alfanumérico
create or replace function public.bs_so_dig(p text) returns text
language sql immutable as $$ select regexp_replace(coalesce(p,''),'[^0-9]','','g') $$;

create or replace function public.bs_so_alnum(p text) returns text
language sql immutable as $$ select upper(regexp_replace(coalesce(p,''),'[^0-9A-Za-z]','','g')) $$;

-- 2. CPF, dígitos verificadores
create or replace function public.bs_cpf_valido(p text) returns boolean
language plpgsql immutable as $function$
declare d text; s int; r int; i int;
begin
  d := public.bs_so_dig(p);
  if length(d) <> 11 then return false; end if;
  if d ~ '^(.)\1{10}$' then return false; end if;
  s := 0;
  for i in 1..9 loop s := s + substr(d,i,1)::int * (11 - i); end loop;
  r := 11 - (s % 11); if r >= 10 then r := 0; end if;
  if r <> substr(d,10,1)::int then return false; end if;
  s := 0;
  for i in 1..10 loop s := s + substr(d,i,1)::int * (12 - i); end loop;
  r := 11 - (s % 11); if r >= 10 then r := 0; end if;
  return r = substr(d,11,1)::int;
end $function$;

-- 3. CNPJ, dígitos verificadores, nos dois formatos
--    Desde 31 de julho de 2026 a Receita Federal emite CNPJ alfanumérico. As
--    doze primeiras posições aceitam letra, as duas últimas continuam sendo
--    algarismos. O cálculo é o mesmo de sempre, com cada caractere valendo o
--    seu código ASCII menos 48, de modo que os CNPJ antigos, só numéricos,
--    continuam válidos por esta mesma conta.
create or replace function public.bs_cnpj_valido(p text) returns boolean
language plpgsql immutable as $function$
declare d text; s int; r int; i int; pes int[];
begin
  d := public.bs_so_alnum(p);
  if length(d) <> 14 then return false; end if;
  if substr(d,13,2) !~ '^[0-9]{2}$' then return false; end if;
  if d ~ '^(.)\1{13}$' then return false; end if;
  pes := array[5,4,3,2,9,8,7,6,5,4,3,2];
  s := 0;
  for i in 1..12 loop s := s + (ascii(substr(d,i,1)) - 48) * pes[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  if r <> substr(d,13,1)::int then return false; end if;
  pes := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
  s := 0;
  for i in 1..13 loop s := s + (ascii(substr(d,i,1)) - 48) * pes[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  return r = substr(d,14,1)::int;
end $function$;

grant execute on function public.bs_cpf_valido(text) to authenticated;
grant execute on function public.bs_cnpj_valido(text) to authenticated;
