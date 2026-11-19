-- BlackFlow NFS-e multi-municipio: drafts must not assume SEFIN Nacional
-- before resolving the emitter of that specific establishment.
alter table public.bf_fiscal_notas
 alter column modelo_integracao set default 'a_definir';
comment on column public.bf_fiscal_notas.modelo_integracao is
 'Canal fiscal a resolver por clinica, municipio, regime e credenciamento. Em rascunho usar a_definir; nao equivale a emissao autorizada.';
