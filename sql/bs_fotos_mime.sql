-- ===========================================================================
-- Balde de fotos: aceitar os tipos que a clinica guarda de verdade
--
-- O envio de arquivos parava no primeiro item recusado pelo servidor, com a
-- mensagem "mime type application/pdf is not supported". Como o codigo
-- interrompia a fila nesse ponto, nada mais subia, e o acervo ficava apenas
-- no computador. O lado do aplicativo ja foi corrigido para pular o arquivo
-- recusado e seguir. Aqui o balde passa a aceitar imagem e PDF, que e o que
-- a clinica realmente guarda: foto de evolucao, documento digitalizado e
-- exame.
--
-- Pode ser executado mais de uma vez.
-- ===========================================================================

update storage.buckets
   set allowed_mime_types = array[
         'image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif',
         'application/pdf'
       ],
       file_size_limit = greatest(coalesce(file_size_limit, 0), 26214400)
 where id = 'fotos';

select 'CONFERENCIA=' ||
       ' balde:' || coalesce((select id from storage.buckets where id = 'fotos'), 'nao existe') ||
       ' tipos:' || coalesce((select array_to_string(allowed_mime_types, ',')
                                from storage.buckets where id = 'fotos'), 'livre') ||
       ' limite_mb:' || coalesce((select (file_size_limit / 1048576)::text
                                    from storage.buckets where id = 'fotos'), '-') as r;
