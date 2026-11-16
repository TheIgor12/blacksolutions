-- ---------------------------------------------------------------------------
-- NÃO RODE ESTE ARQUIVO.
--
-- Escrito em 16/11/2026 às 13h52. Ficou obsoleto no mesmo dia, às 14h17,
-- quando o script sql/bs_seguranca_16nov.sql do Lex Calc foi aplicado.
--
-- Aquele script faz tudo o que este fazia, e mais:
--   . um teste grátis por usuário, inclusive para quem já paga
--   . conferência do CNPJ na Receita Federal pelo próprio banco
--   . confirmação de celular por SMS, pronta para ser ligada
--   . bs_identidades separada por produto, com chave (documento, produto)
--
-- Rodar este arquivo agora QUEBRARIA O CADASTRO: ele substitui
-- public.criar_clinica por uma versão que insere com "on conflict (documento)",
-- e essa restrição deixou de existir quando a chave primária passou a ser
-- (documento, produto). Todo cadastro novo falharia.
--
-- O conteúdo original foi removido de propósito, para que ninguém o execute
-- por engano. O histórico do Git guarda a versão anterior, se for preciso ler.
-- ---------------------------------------------------------------------------
do $$
begin
  raise exception 'Script obsoleto. Use sql/bs_seguranca_16nov.sql do repositorio do Lex Calc.';
end $$;
