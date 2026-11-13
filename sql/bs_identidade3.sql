-- ---------------------------------------------------------------------------
-- BlackSolutions, identidade do responsável, parte 3
-- A nova criar_clinica. Rode depois de bs_identidade.sql e bs_identidade2.sql.
-- ---------------------------------------------------------------------------

drop function if exists public.criar_clinica(text);

create or replace function public.criar_clinica(
  p_nome   text,
  p_cpf    text default null,
  p_cnpj   text default null,
  p_razao  text default null,
  p_verif  jsonb default null)
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

  -- CPF do responsável
  v_cpf := public.bs_so_dig(p_cpf);
  if v_cpf = '' then
    raise exception 'Atualize o programa para a versão mais nova. O cadastro agora pede o CPF do responsável.';
  end if;
  if not public.bs_cpf_valido(v_cpf) then
    raise exception 'O CPF informado não é válido. Confira os números.';
  end if;

  -- CNPJ, quando houver
  v_cnpj := nullif(public.bs_so_alnum(p_cnpj), '');
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

  -- O documento já usou teste grátis alguma vez
  if not v_mestre and exists (select 1 from public.bs_identidades where documento = v_cpf) then
    raise exception 'Este CPF já utilizou o teste grátis. Entre na conta que você já tem, ou assine para abrir outra unidade. Se perdeu o acesso, fale com o suporte.';
  end if;
  if not v_mestre and v_cnpj is not null and exists (select 1 from public.bs_identidades where documento = v_cnpj) then
    raise exception 'Este CNPJ já utilizou o teste grátis. Entre na conta que você já tem, ou assine para abrir outra unidade. Se perdeu o acesso, fale com o suporte.';
  end if;

  -- A primeira clínica do sistema é cortesia, sem vencimento
  if not exists (select 1 from public.clinicas) then
    insert into public.clinicas (nome, plano, valido_ate, cpf_responsavel, cnpj, razao_social, verificacao)
    values (trim(p_nome), 'cortesia', null, v_cpf, v_cnpj, nullif(trim(coalesce(p_razao,'')),''), p_verif)
    returning id into v_id;
  else
    insert into public.clinicas (nome, plano, valido_ate, cpf_responsavel, cnpj, razao_social, verificacao)
    values (trim(p_nome), 'teste', current_date + public.bs_teste_dias(),
            v_cpf, v_cnpj, nullif(trim(coalesce(p_razao,'')),''), p_verif)
    returning id into v_id;
  end if;

  insert into public.membros (clinica_id, user_id, email, nome, papel)
  values (v_id, auth.uid(), lower(v_email), v_nome, 'admin');

  -- Queima os documentos, para não servirem de teste outra vez
  insert into public.bs_identidades (documento, tipo, clinica_id, user_id, email, razao, verificacao)
  values (v_cpf, 'cpf', v_id, auth.uid(), lower(v_email), null, null)
  on conflict (documento) do nothing;

  if v_cnpj is not null then
    insert into public.bs_identidades (documento, tipo, clinica_id, user_id, email, razao, verificacao)
    values (v_cnpj, 'cnpj', v_id, auth.uid(), lower(v_email), nullif(trim(coalesce(p_razao,'')),''), p_verif)
    on conflict (documento) do nothing;
  end if;

  return v_id;
end
$function$;

grant execute on function public.criar_clinica(text,text,text,text,jsonb) to authenticated;
