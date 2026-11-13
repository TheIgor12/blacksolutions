-- ---------------------------------------------------------------------------
-- BlackSolutions, limite de contas em teste grátis
--
-- Problema: a função criar_clinica não tinha limite nenhum. O mesmo usuário
-- podia abrir cadastro novo a cada sete dias e usar o BlackFlow de graça para
-- sempre. A prorrogação tinha controle, a criação não.
--
-- Além disso a função gravava valido_ate = current_date + 14, número solto
-- dentro do código, contrariando bs_config.teste_dias. O prazo real já era de
-- sete dias porque o gatilho clinicas_prazo_teste regravava o campo depois,
-- mas o 14 ficava no código e no comentário, enganando quem fosse ler.
--
-- Regra que passa a valer:
--   1. Cada usuário pode ter um cadastro em teste grátis, não mais de um.
--   2. Quem já tem um cadastro pagante abre quantas unidades quiser.
--   3. O login mestre não tem limite.
--   4. O prazo vem de bs_config.teste_dias, em um lugar só.
--
-- Limite conhecido desta regra: ela amarra o teste ao usuário, não à pessoa.
-- Quem criar outro e-mail começa um teste novo. Fechar isso de verdade exige
-- confirmação de telefone ou de CPF no cadastro, que é decisão de produto.
-- ---------------------------------------------------------------------------

create or replace function public.criar_clinica(p_nome text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id    uuid;
  v_email text;
  v_nome  text;
  v_teste int;
  v_pago  int;
begin
  if auth.uid() is null then
    raise exception 'Faça login primeiro';
  end if;

  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Informe o nome da clínica';
  end if;

  select email, raw_user_meta_data->>'nome'
    into v_email, v_nome
    from auth.users
   where id = auth.uid();

  -- Quantos cadastros este usuário já administra, separados por situação.
  select count(*) filter (where coalesce(c.plano,'teste') = 'teste'),
         count(*) filter (where coalesce(c.plano,'teste') <> 'teste')
    into v_teste, v_pago
    from public.membros m
    join public.clinicas c on c.id = m.clinica_id
   where m.user_id = auth.uid()
     and m.papel = 'admin';

  if v_teste >= 1 and v_pago = 0 and not public.lm_e_mestre() then
    raise exception 'Esta conta já tem um cadastro em teste grátis. Entre nele para continuar de onde parou, ou assine para abrir outra unidade.';
  end if;

  -- A primeira clínica do sistema é cortesia, sem vencimento.
  if not exists (select 1 from public.clinicas) then
    insert into public.clinicas (nome, plano, valido_ate)
    values (trim(p_nome), 'cortesia', null)
    returning id into v_id;
  else
    -- O prazo sai de bs_config.teste_dias. O gatilho clinicas_prazo_teste
    -- regrava o campo, e o valor abaixo é o mesmo, para a função continuar
    -- correta se algum dia o gatilho sair.
    insert into public.clinicas (nome, plano, valido_ate)
    values (trim(p_nome), 'teste', current_date + public.bs_teste_dias())
    returning id into v_id;
  end if;

  insert into public.membros (clinica_id, user_id, email, nome, papel)
  values (v_id, auth.uid(), lower(v_email), v_nome, 'admin');

  return v_id;
end
$function$;

grant execute on function public.criar_clinica(text) to authenticated;
