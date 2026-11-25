-- Proposta para auditoria. Executar após bf_estetmapa_registros_20261125.sql.
-- Histórico sem mapa, seleção de produto, dose ou técnica. Mantém as políticas existentes.
begin;

alter table public.bf_estetmapa_registros
  add column if not exists tipo_registro text not null default 'mapa_estetico',
  alter column vista drop not null,
  alter column regiao drop not null,
  alter column lado drop not null,
  alter column quantidade drop not null,
  alter column unidade drop not null;

-- Os demais limites das colunas continuam valendo; a forma abaixo exige o conjunto
-- completo de campo anatômico e quantitativo no mapa, e sua ausência no histórico.
alter table public.bf_estetmapa_registros drop constraint if exists bf_estetmapa_forma_registro;
alter table public.bf_estetmapa_registros add constraint bf_estetmapa_forma_registro check (
  (tipo_registro = 'mapa_estetico' and vista is not null and regiao is not null and lado is not null
   and quantidade is not null and unidade is not null)
  or
  (tipo_registro = 'intramuscular_realizada' and vista is null and regiao is null and lado is null
   and quantidade is null and unidade is null and unidade_descricao is null)
);
grant insert (tipo_registro) on public.bf_estetmapa_registros to authenticated;

commit;
select 'CONFERENCIA=' || count(*) from pg_constraint
  where conrelid='public.bf_estetmapa_registros'::regclass and conname='bf_estetmapa_forma_registro';
