-- BlackFlow 1.16.0: add nationwide Medicine/CRM as an independent clinical segment.
-- Preserve existing clinic data, tenant RLS, PDF draft safeguards and professional permissions.
BEGIN;

ALTER TABLE public.bf_profissionais DROP CONSTRAINT IF EXISTS bf_profissionais_conselho_check;
ALTER TABLE public.bf_profissionais ADD CONSTRAINT bf_profissionais_conselho_check
 CHECK (conselho IN ('CRBM','CRO','CRM'));

ALTER TABLE public.bf_profissionais DROP CONSTRAINT IF EXISTS bf_profissionais_segmento_check;
ALTER TABLE public.bf_profissionais ADD CONSTRAINT bf_profissionais_segmento_check
 CHECK (segmento IN ('biomedicina','odontologia','medicina'));

ALTER TABLE public.bf_prontuarios DROP CONSTRAINT IF EXISTS bf_prontuarios_segmento_check;
ALTER TABLE public.bf_prontuarios ADD CONSTRAINT bf_prontuarios_segmento_check
 CHECK (segmento IN ('biomedicina','odontologia','medicina'));

ALTER TABLE public.bf_catalogo_servicos DROP CONSTRAINT IF EXISTS bf_catalogo_servicos_segmento_check;
ALTER TABLE public.bf_catalogo_servicos ADD CONSTRAINT bf_catalogo_servicos_segmento_check
 CHECK (segmento IN ('biomedicina','odontologia','medicina'));

ALTER TABLE public.bf_receituario_modelos DROP CONSTRAINT IF EXISTS bf_receituario_modelos_segmento_check;
ALTER TABLE public.bf_receituario_modelos ADD CONSTRAINT bf_receituario_modelos_segmento_check
 CHECK (segmento IN ('podologia','odontologia','biomedicina','medicina'));

ALTER TABLE public.bf_receituario_documentos DROP CONSTRAINT IF EXISTS bf_receituario_documentos_segmento_check;
ALTER TABLE public.bf_receituario_documentos ADD CONSTRAINT bf_receituario_documentos_segmento_check
 CHECK (segmento IN ('podologia','odontologia','biomedicina','medicina'));

-- Update the existing routines without changing their authorization model.
DO $medical$
DECLARE original text;
DECLARE modified text;
BEGIN
 SELECT pg_get_functiondef('public.bf_segmento_disponivel(text)'::regprocedure) INTO original;
 modified := replace(original, '''podologia'',''estetica'',''beleza'',''barbearia'',''biomedicina'',''odontologia''',
     '''podologia'',''estetica'',''beleza'',''barbearia'',''biomedicina'',''odontologia'',''medicina''');
 IF modified=original THEN RAISE EXCEPTION 'Unexpected bf_segmento_disponivel definition'; END IF;
 EXECUTE modified;

 SELECT pg_get_functiondef('public.bs_segmento_definir(text)'::regprocedure) INTO original;
 modified := replace(original, '''podologia'',''estetica'',''beleza'',''barbearia'',''biomedicina'',''odontologia''',
     '''podologia'',''estetica'',''beleza'',''barbearia'',''biomedicina'',''odontologia'',''medicina''');
 IF modified=original THEN RAISE EXCEPTION 'Unexpected bs_segmento_definir definition'; END IF;
 EXECUTE modified;

 SELECT pg_get_functiondef('public.bs_segmento_trocar(uuid,text)'::regprocedure) INTO original;
 modified := replace(original, '''podologia'',''estetica'',''beleza'',''barbearia'',''biomedicina'',''odontologia''',
     '''podologia'',''estetica'',''beleza'',''barbearia'',''biomedicina'',''odontologia'',''medicina''');
 IF modified=original THEN RAISE EXCEPTION 'Unexpected bs_segmento_trocar definition'; END IF;
 EXECUTE modified;

 SELECT pg_get_functiondef('public.bf_receituario_pode_emitir(uuid,text)'::regprocedure) INTO original;
 modified := replace(original, 's in (''odontologia'',''biomedicina'')',
     's in (''odontologia'',''biomedicina'',''medicina'')');
 modified := replace(modified, 'p.segmento=s and p.ativo',
     'p.segmento=s and p.ativo and (s <> ''medicina'' or (p.conselho=''CRM'' and p.inscricao ~ ''^[0-9]{1,10}$'' and p.uf ~ ''^[A-Z]{2}$''))');
 IF modified=original
    OR position('s in (''odontologia'',''biomedicina'',''medicina'')' in modified)=0
    OR position('p.conselho=''CRM''' in modified)=0
 THEN RAISE EXCEPTION 'Unexpected bf_receituario_pode_emitir definition'; END IF;
 EXECUTE modified;
END $medical$;

COMMIT;
