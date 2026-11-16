-- ---------------------------------------------------------------------------
-- BlackSolutions, endurecimento das travas
-- Fecha quatro buracos apontados na auditoria de 16/11/2026.
-- Rode o script inteiro uma única vez. Ele não apaga dado nenhum.
-- ---------------------------------------------------------------------------

-- 1. BURACO: quem administra uma clínica paga podia abrir testes grátis sem
--    limite, porque a condição era "v_teste >= 1 e v_pago = 0". Bastava ter
--    uma unidade paga para a trava nunca disparar, e as unidades novas
--    nasciam com plano 'teste'.
--    REGRA NOVA: um teste grátis por usuário, sempre. Unidade adicional de
--    cliente pagante passa a ser aberta pelo suporte, que é o que você faz
--    hoje de qualquer forma, com três clientes.
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

  v_dom := lower(split_part(coalesce(v_email,''), '@', 2));
  if not v_mestre and exists (select 1 from public.bs_dominios_bloqueados where dominio = v_dom) then
    raise exception 'Este endereço de e-mail é temporário. Cadastre-se com o e-mail do seu negócio.';
  end if;

  v_cpf := public.bs_so_dig(p_cpf);
  if v_cpf = '' then
    raise exception 'Atualize o programa para a versão mais nova. O cadastro agora pede o CPF do responsável.';
  end if;
  if not public.bs_cpf_valido(v_cpf) then
    raise exception 'O CPF informado não é válido. Confira os números.';
  end if;

  v_cnpj := nullif(public.bs_so_alnum(p_cnpj), '');
  if v_cnpj is not null and not public.bs_cnpj_valido(v_cnpj) then
    raise exception 'O CNPJ informado não é válido. Confira os caracteres.';
  end if;
  if v_cnpj is null and public.bs_cfg('exigir_cnpj', 0) = 1 and not v_mestre then
    raise exception 'Informe o CNPJ do negócio.';
  end if;

  -- AQUI ESTÁ A MUDANÇA: conta os testes, e não importa se há unidade paga.
  select count(*) filter (where coalesce(c.plano,'teste') = 'teste')
    into v_teste
    from public.membros m
    join public.clinicas c on c.id = m.clinica_id
   where m.user_id = auth.uid() and m.papel = 'admin';

  if v_teste >= 1 and not v_mestre then
    raise exception 'Esta conta já tem um cadastro em teste grátis. Entre nele para continuar de onde parou. Para abrir outra unidade, fale com o suporte.';
  end if;

  if not v_mestre and exists (select 1 from public.bs_identidades where documento = v_cpf) then
    raise exception 'Este CPF já utilizou o teste grátis. Entre na conta que você já tem, ou fale com o suporte.';
  end if;
  if not v_mestre and v_cnpj is not null and exists (select 1 from public.bs_identidades where documento = v_cnpj) then
    raise exception 'Este CNPJ já utilizou o teste grátis. Entre na conta que você já tem, ou fale com o suporte.';
  end if;

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

-- 2. BURACO: bs_identidades só tinha política de leitura. Nem o login mestre
--    conseguia liberar um CPF digitado errado, e cliente legítimo ficava
--    travado para sempre. Agora o mestre apaga e corrige pela aplicação.
drop policy if exists bs_identidades_apagar on public.bs_identidades;
create policy bs_identidades_apagar on public.bs_identidades
  for delete to authenticated using (public.lm_e_mestre());

drop policy if exists bs_identidades_alterar on public.bs_identidades;
create policy bs_identidades_alterar on public.bs_identidades
  for update to authenticated using (public.lm_e_mestre()) with check (public.lm_e_mestre());

-- 3. Registro de quem liberou um documento, para a decisão não sumir.
create table if not exists public.bs_identidades_liberadas (
  id          bigserial primary key,
  documento   text not null,
  motivo      text,
  liberado_por uuid default auth.uid(),
  liberado_em timestamptz not null default now()
);
alter table public.bs_identidades_liberadas enable row level security;
drop policy if exists bs_idlib_mestre on public.bs_identidades_liberadas;
create policy bs_idlib_mestre on public.bs_identidades_liberadas
  for all to authenticated using (public.lm_e_mestre()) with check (public.lm_e_mestre());

create or replace function public.bs_liberar_documento(p_doc text, p_motivo text default null)
returns boolean
language plpgsql security definer set search_path to 'public' as $function$
declare v_doc text;
begin
  if not public.lm_e_mestre() then raise exception 'Somente o login mestre'; end if;
  v_doc := public.bs_so_alnum(p_doc);
  if v_doc = '' then raise exception 'Informe o documento'; end if;
  delete from public.bs_identidades where documento = v_doc or documento = public.bs_so_dig(p_doc);
  insert into public.bs_identidades_liberadas (documento, motivo) values (v_doc, p_motivo);
  return true;
end $function$;
grant execute on function public.bs_liberar_documento(text,text) to authenticated;

-- 4. BURACO: a lista de domínios descartáveis tinha 24 entradas. Ampliada.
insert into public.bs_dominios_bloqueados (dominio)
select d from (values
  ('temp-mail.io'),('tempmailo.com'),('tempmail.net'),('tempmail.plus'),
  ('mail.tm'),('mailtm.com'),('burnermail.io'),('anonaddy.me'),
  ('simplelogin.io'),('33mail.com'),('spam4.me'),('byom.de'),
  ('mailcatch.com'),('mail-temporaire.fr'),('jetable.org'),('nospam.ze.tc'),
  ('discard.email'),('discardmail.com'),('kasmail.com'),('mailexpire.com'),
  ('mintemail.com'),('mytrashmail.com'),('nowmymail.com'),('objectmail.com'),
  ('proxymail.eu'),('rcpt.at'),('spambog.com'),('spamfree24.org'),
  ('tempinbox.com'),('tempemail.net'),('trbvm.com'),('wegwerfmail.de'),
  ('wh4f.org'),('zetmail.com'),('deadaddress.com'),('e4ward.com'),
  ('emltmp.com'),('fakemail.net'),('filzmail.com'),('gishpuppy.com'),
  ('haltospam.com'),('incognitomail.com'),('klzlk.com'),('koszmail.pl'),
  ('lroid.com'),('luxusmail.org'),('mailbidon.com'),('maileater.com'),
  ('mailin8r.com'),('mailmetrash.com'),('mailzilla.com'),('mt2015.com'),
  ('notmailinator.com'),('pookmail.com'),('putthisinyourspamdatabase.com'),
  ('quickinbox.com'),('safetymail.info'),('sendspamhere.com'),('spamhereplease.com'),
  ('tempomail.fr'),('thankyou2010.com'),('trash-mail.at'),('trashmail.me'),
  ('veryrealemail.com'),('willhackforfood.biz'),('yopmail.fr'),('yopmail.net')
) t(d)
where not exists (select 1 from public.bs_dominios_bloqueados b where b.dominio = t.d);

-- 5. O teste do Lex Calc passa a ter o mesmo prazo do BlackFlow.
update public.bs_config set valor = (select valor from public.bs_config where chave='teste_dias')
 where chave = 'lexcalc_teste_dias'
   and exists (select 1 from public.bs_config where chave='teste_dias');

select 'pronto' as resultado,
       (select count(*) from public.bs_dominios_bloqueados) as dominios_bloqueados,
       (select valor from public.bs_config where chave='teste_dias') as teste_blackflow,
       (select valor from public.bs_config where chave='lexcalc_teste_dias') as teste_lexcalc;
