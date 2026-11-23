-- ---------------------------------------------------------------------------
-- BlackSolutions, cadastro: um documento ou o outro, e o celular do responsável
--
-- Antes: a primeira etapa pedia nome, e-mail e senha, e a segunda exigia o CPF
-- do responsável sempre, mesmo quando o negócio tinha CNPJ.
--
-- Agora: a primeira etapa pede celular e e-mail, e a segunda pergunta se a
-- pessoa possui CNPJ. Quem possui informa o CNPJ; quem não possui informa o
-- CPF. Um dos dois é obrigatório, nunca os dois.
--
-- A trava contra teste grátis repetido continua, agora sobre o documento que
-- foi informado, seja ele qual for.
--
-- Rodar no editor de SQL do projeto. Pode rodar mais de uma vez sem efeito
-- colateral.
-- ---------------------------------------------------------------------------

-- 1. O CPF deixa de ser obrigatório na tabela, e entra o celular.
alter table public.clinicas alter column cpf_responsavel drop not null;
alter table public.clinicas add column if not exists celular_responsavel text;

-- 2. A função de criação aceita CPF ou CNPJ.
create or replace function public.criar_clinica(
  p_nome    text,
  p_cpf     text default null,
  p_cnpj    text default null,
  p_razao   text default null,
  p_verif   jsonb default null,
  p_celular text default null)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id     uuid;
  v_email  text;
  v_nome   text;
  v_cpf    text;
  v_cnpj   text;
  v_cel    text;
  v_dom    text;
  v_teste  int;
  v_pago   int;
  v_mestre boolean;
begin
  if auth.uid() is null then
    raise exception 'Faça login primeiro';
  end if;

  v_mestre := public.lm_e_mestre();

  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Informe o nome do negócio';
  end if;

  select email, raw_user_meta_data->>'nome'
    into v_email, v_nome
    from auth.users where id = auth.uid();

  -- E-mail descartável
  v_dom := lower(split_part(coalesce(v_email,''), '@', 2));
  if not v_mestre and exists (select 1 from public.bs_dominios_bloqueados where dominio = v_dom) then
    raise exception 'Este endereço de e-mail é temporário. Cadastre-se com o e-mail do seu negócio.';
  end if;

  v_cpf  := nullif(public.bs_so_dig(p_cpf), '');
  v_cnpj := nullif(public.bs_so_alnum(p_cnpj), '');
  v_cel  := nullif(public.bs_so_dig(coalesce(p_celular,
              (select raw_user_meta_data->>'celular' from auth.users where id = auth.uid()))), '');

  -- Um documento é obrigatório, o outro é dispensável.
  if v_cpf is null and v_cnpj is null then
    raise exception 'Informe o CNPJ, se você possui. Se não possui, informe o CPF.';
  end if;

  if v_cpf is not null and not public.bs_cpf_valido(v_cpf) then
    raise exception 'O CPF informado não é válido. Confira os números.';
  end if;
  if v_cnpj is not null and not public.bs_cnpj_valido(v_cnpj) then
    raise exception 'O CNPJ informado não é válido. Confira os caracteres.';
  end if;
  if v_cnpj is null and public.bs_cfg('exigir_cnpj', 0) = 1 and not v_mestre then
    raise exception 'Informe o CNPJ do negócio.';
  end if;

  -- Quantos cadastros este usuário já administra
  select count(*) filter (where coalesce(c.plano,'teste') = 'teste'),
         count(*) filter (where coalesce(c.plano,'teste') <> 'teste')
    into v_teste, v_pago
    from public.membros m
    join public.clinicas c on c.id = m.clinica_id
   where m.user_id = auth.uid() and m.papel = 'admin';

  if v_teste >= 1 and v_pago = 0 and not v_mestre then
    raise exception 'Esta conta já tem um cadastro em teste grátis. Entre nele para continuar de onde parou, ou assine para abrir outra unidade.';
  end if;

  -- O documento informado já usou teste grátis alguma vez
  if not v_mestre and v_cpf is not null
     and exists (select 1 from public.bs_identidades where documento = v_cpf) then
    raise exception 'Este CPF já utilizou o teste grátis. Entre na conta que você já tem, ou assine para abrir outra unidade. Se perdeu o acesso, fale com o suporte.';
  end if;
  if not v_mestre and v_cnpj is not null
     and exists (select 1 from public.bs_identidades where documento = v_cnpj) then
    raise exception 'Este CNPJ já utilizou o teste grátis. Entre na conta que você já tem, ou assine para abrir outra unidade. Se perdeu o acesso, fale com o suporte.';
  end if;

  -- A primeira clínica do sistema é cortesia, sem vencimento
  if not exists (select 1 from public.clinicas) then
    insert into public.clinicas (nome, plano, valido_ate, cpf_responsavel, cnpj, razao_social, verificacao, celular_responsavel)
    values (trim(p_nome), 'cortesia', null, v_cpf, v_cnpj,
            nullif(trim(coalesce(p_razao,'')),''), p_verif, v_cel)
    returning id into v_id;
  else
    insert into public.clinicas (nome, plano, valido_ate, cpf_responsavel, cnpj, razao_social, verificacao, celular_responsavel)
    values (trim(p_nome), 'teste', current_date + public.bs_teste_dias(),
            v_cpf, v_cnpj, nullif(trim(coalesce(p_razao,'')),''), p_verif, v_cel)
    returning id into v_id;
  end if;

  insert into public.membros (clinica_id, user_id, email, nome, papel)
  values (v_id, auth.uid(), lower(v_email), v_nome, 'admin');

  -- Queima os documentos informados, para não servirem de teste outra vez
  if v_cpf is not null then
    insert into public.bs_identidades (documento, tipo, clinica_id, user_id, email, razao, verificacao)
    values (v_cpf, 'cpf', v_id, auth.uid(), lower(v_email), null, null)
    on conflict (documento) do nothing;
  end if;

  if v_cnpj is not null then
    insert into public.bs_identidades (documento, tipo, clinica_id, user_id, email, razao, verificacao)
    values (v_cnpj, 'cnpj', v_id, auth.uid(), lower(v_email),
            nullif(trim(coalesce(p_razao,'')),''), p_verif)
    on conflict (documento) do nothing;
  end if;

  return v_id;
end
$function$;

grant execute on function public.criar_clinica(text,text,text,text,jsonb,text) to authenticated;

-- 3. A versão de cinco argumentos continua existindo para quem ainda não
--    atualizou o programa, e apenas repassa para a nova.
create or replace function public.criar_clinica(
  p_nome   text,
  p_cpf    text default null,
  p_cnpj   text default null,
  p_razao  text default null,
  p_verif  jsonb default null)
returns uuid
language sql
security definer
set search_path to 'public'
as $function$
  select public.criar_clinica(p_nome, p_cpf, p_cnpj, p_razao, p_verif, null);
$function$;

grant execute on function public.criar_clinica(text,text,text,text,jsonb) to authenticated;

-- 4. Conferência
select 'CONFERENCIA=' ||
       'argumentos:' || (select count(*) from pg_proc p
                           join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname='public' and p.proname='criar_clinica')::text ||
       ' celular_na_tabela:' || (select count(*) from information_schema.columns
                                  where table_schema='public' and table_name='clinicas'
                                    and column_name='celular_responsavel')::text ||
       ' cpf_obrigatorio:' || (select case when is_nullable='YES' then 'nao' else 'sim' end
                                 from information_schema.columns
                                where table_schema='public' and table_name='clinicas'
                                  and column_name='cpf_responsavel') as resultado;
