-- Proposta para auditoria. Não executar em produção nesta entrega.
-- Registro estruturado de aplicações já realizadas. Não usa o acervo geral de sincronização.
begin;

create table if not exists public.bf_estetmapa_registros (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  prontuario_id uuid not null references public.bf_prontuarios(id) on delete restrict,
  sessao_id uuid not null,
  sessao_data date not null,
  vista text not null check (vista in ('frontal','obliqua_direita','obliqua_esquerda','perfil_direito','perfil_esquerdo','corpo_frente','corpo_costas')),
  regiao text not null check (regiao in ('fronte','glabela','periorbital','pes_galinha','dorso_nasal','ponta_nasal','sulco_nasogeniano','malar','zigomatico','labio_superior','labio_inferior','filtro','sulco_mentolabial','mentao','angulo_mandibular','submentoniana','pescoco','abdome','flanco','culote','face_interna_coxa','gluteo','braco')),
  lado text not null check (lado in ('direito','esquerdo','central','bilateral')),
  produto text not null check (char_length(btrim(produto)) between 1 and 180 and regexp_replace(lower(produto), '[^a-z0-9]', '', 'g') !~ 'pmma|polimetilmetacrilato'),
  quantidade numeric(14,6) not null check (quantidade > 0 and quantidade < 1000000),
  unidade text not null check (unidade in ('ml','unidade','ui','utr','g','mg','outra')),
  unidade_descricao text check ((unidade='outra' and unidade_descricao is not null and char_length(btrim(unidade_descricao)) between 1 and 24) or (unidade<>'outra' and unidade_descricao is null)),
  lote text not null check (char_length(btrim(lote)) between 1 and 100),
  validade date not null check (validade between '1900-01-01'::date and '2199-12-31'::date),
  observacoes text not null default '' check (char_length(observacoes) <= 2000),
  criado_por uuid not null default auth.uid(),
  criado_em timestamptz not null default now(),
  constraint bf_estetmapa_data_sessao check (sessao_data between '1900-01-01'::date and '2199-12-31'::date),
  constraint bf_estetmapa_regiao_vista check (
    (vista like 'corpo_%') = (regiao in ('abdome','flanco','culote','face_interna_coxa','gluteo','braco'))
    or (vista like 'corpo_%' and regiao in ('submentoniana','pescoco'))
  )
);

create index if not exists bf_estetmapa_prontuario_data_idx
  on public.bf_estetmapa_registros (clinica_id, prontuario_id, sessao_data desc, criado_em desc);

alter table public.bf_estetmapa_registros enable row level security;
revoke all on public.bf_estetmapa_registros from public, anon, authenticated;
grant select on public.bf_estetmapa_registros to authenticated;
grant insert (id,clinica_id,prontuario_id,sessao_id,sessao_data,vista,regiao,lado,
  produto,quantidade,unidade,unidade_descricao,lote,validade,observacoes)
  on public.bf_estetmapa_registros to authenticated;

drop policy if exists bf_estetmapa_ler on public.bf_estetmapa_registros;
create policy bf_estetmapa_ler on public.bf_estetmapa_registros for select to authenticated using (
  public.bf_e_clinico(clinica_id)
  and exists (
    select 1 from public.bf_profissionais p
    where p.clinica_id = bf_estetmapa_registros.clinica_id
      and p.user_id = (select auth.uid()) and p.segmento = 'biomedicina' and p.ativo is true
  )
  and exists (
    select 1 from public.bf_prontuarios p
    where p.id = bf_estetmapa_registros.prontuario_id
      and p.clinica_id = bf_estetmapa_registros.clinica_id and p.segmento = 'biomedicina'
  )
);

drop policy if exists bf_estetmapa_registrar on public.bf_estetmapa_registros;
create policy bf_estetmapa_registrar on public.bf_estetmapa_registros for insert to authenticated with check (
  criado_por = (select auth.uid())
  and public.bf_e_clinico(clinica_id)
  and exists (
    select 1 from public.bf_profissionais p
    where p.clinica_id = bf_estetmapa_registros.clinica_id
      and p.user_id = (select auth.uid()) and p.segmento = 'biomedicina' and p.ativo is true
  )
  and exists (
    select 1 from public.bf_prontuarios p
    where p.id = bf_estetmapa_registros.prontuario_id
      and p.clinica_id = bf_estetmapa_registros.clinica_id and p.segmento = 'biomedicina'
  )
);

commit;
select 'CONFERENCIA=' || count(*) from pg_policies where schemaname='public' and tablename='bf_estetmapa_registros';
