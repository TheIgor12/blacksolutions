-- BlackFlow: consulta autenticada por token opaco sem divulgação de dados clínicos.
-- O QR identifica um registro. Não substitui assinatura ICP-Brasil nem SNCR.
alter table public.bf_receituario_documentos
  add column if not exists verificacao_token_hash text,
  add column if not exists pdf_rascunho_sha256 text,
  add column if not exists pdf_assinado_sha256 text;
create unique index if not exists bf_rec_verificacao_token_hash_unique
 on public.bf_receituario_documentos (verificacao_token_hash)
 where verificacao_token_hash is not null;
alter table public.bf_receituario_documentos
  add constraint bf_rec_token_hash_format
  check (verificacao_token_hash is null or verificacao_token_hash ~ '^[0-9a-f]{64}$') not valid;
alter table public.bf_receituario_documentos validate constraint bf_rec_token_hash_format;
alter table public.bf_receituario_documentos
  add constraint bf_rec_pdf_hash_format
  check ((pdf_rascunho_sha256 is null or pdf_rascunho_sha256 ~ '^[0-9a-f]{64}$')
     and (pdf_assinado_sha256 is null or pdf_assinado_sha256 ~ '^[0-9a-f]{64}$')) not valid;
alter table public.bf_receituario_documentos validate constraint bf_rec_pdf_hash_format;
comment on column public.bf_receituario_documentos.verificacao_token_hash is
 'Hash SHA-256 de token aleatório de 256 bits. Usado somente para consulta do REGISTRO, não da validade de assinatura.';