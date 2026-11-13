-- ---------------------------------------------------------------------------
-- Lex Calc, cobrança aplicada no banco e não só na tela
--
-- Problema: no Lex Calc o bloqueio por falta de pagamento existe apenas no
-- navegador. A variável ASS.ok é calculada no próprio arquivo index.html, a
-- partir de auth.users.created_at e da tabela lexcalc_assinantes. As políticas
-- de lexcalc_calculos exigem somente user_id = auth.uid(), sem nenhuma
-- verificação de assinatura. Quem abrir o console do navegador e escrever
-- ASS.ok = true continua usando o sistema para sempre, e os cálculos continuam
-- sendo gravados no banco normalmente, porque o banco nunca recusa.
--
-- No BlackFlow isso já está certo: a função clinica_liberada é chamada dentro
-- das políticas de registros e verifica ativa e valido_ate. Este arquivo faz o
-- mesmo no Lex Calc.
--
-- Decisão de escopo: a gravação passa a exigir assinatura em dia, mas a
-- leitura e a exclusão continuam liberadas para o dono dos dados. Quem deixou
-- de pagar não consegue mais calcular nem salvar, e continua conseguindo abrir
-- e exportar o que é dele. Bloquear também a leitura atrapalharia o direito de
-- acesso e de portabilidade do titular, previstos no art. 18, incisos II e V,
-- da Lei nº 13.709/2018.
--
-- O prazo do teste sai de bs_config, igual ao do BlackFlow, em vez de ficar
-- escrito dentro do index.html.
-- ---------------------------------------------------------------------------

-- 1. O prazo do teste do Lex Calc passa a morar na mesma tabela de configuração
insert into public.bs_config (chave, valor)
select 'lexcalc_teste_dias', '14'
where not exists (select 1 from public.bs_config where chave = 'lexcalc_teste_dias');

-- 2. A função que diz se o usuário pode gravar
create or replace function public.lexcalc_liberado()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    -- o login mestre nunca fica de fora
    public.lm_e_mestre()
    -- assinatura paga e dentro da validade
    or exists (
      select 1 from public.lexcalc_assinantes a
       where a.user_id = auth.uid()
         and a.pago_ate is not null
         and a.pago_ate >= current_date)
    -- ou ainda dentro do teste grátis, contado da criação da conta
    or exists (
      select 1 from auth.users u
       where u.id = auth.uid()
         and u.created_at > now() - make_interval(days => public.bs_cfg('lexcalc_teste_dias', 14)))
$function$;

grant execute on function public.lexcalc_liberado() to authenticated;

-- 3. Gravar passa a exigir assinatura em dia
drop policy if exists lexcalc_criar on public.lexcalc_calculos;
create policy lexcalc_criar on public.lexcalc_calculos
  for insert to authenticated
  with check (user_id = auth.uid() and public.lexcalc_liberado());

drop policy if exists lexcalc_alterar on public.lexcalc_calculos;
create policy lexcalc_alterar on public.lexcalc_calculos
  for update to authenticated
  using (user_id = auth.uid() and public.lexcalc_liberado())
  with check (user_id = auth.uid() and public.lexcalc_liberado());

-- 4. Ler e excluir continuam como estavam, para o dono dos dados.
--    As políticas lexcalc_ler e lexcalc_excluir não são tocadas.
