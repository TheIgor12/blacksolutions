-- Recupera apenas a situação do próprio recibo. Não reabre o convite nem devolve a assinatura.
begin;
create function public.bf_ciencia_consultar_recibo(p_recibo uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when w.revogado_em is null then 'vigente' else 'revogado' end
 from bf_consentimento_privado.provas z join bf_consentimento_privado.pedidos w on w.id=z.pedido_id
 where z.id=p_recibo and w.signatario=auth.uid()
 and w.versao='bf-ciencia-simulacao-ilustrativa-v1'
 and bf_consentimento_privado.sessao_verificada() is not null
$$;
revoke all on function public.bf_ciencia_consultar_recibo(uuid) from public,anon,authenticated;
grant execute on function public.bf_ciencia_consultar_recibo(uuid) to authenticated;
commit;
