-- ---------------------------------------------------------------------------
-- BlackSolutions, identidade do responsável, parte 2
-- Tabelas, configuração e a nova criar_clinica. Rode depois de bs_identidade.sql.
-- ---------------------------------------------------------------------------

-- 4. Configuração: exigir CNPJ ou não
--    Fica desligado. Podólogo, manicure e esteticista autônomo sem MEI existe
--    aos montes, e exigir CNPJ de todos barra cliente legítimo. Para ligar:
--    update public.bs_config set valor='1' where chave='exigir_cnpj';
insert into public.bs_config (chave, valor)
select 'exigir_cnpj','0'
where not exists (select 1 from public.bs_config where chave='exigir_cnpj');

-- 5. Documentos que já abriram teste grátis, mesmo que a clínica suma depois
create table if not exists public.bs_identidades (
  documento   text primary key,
  tipo        text not null check (tipo in ('cpf','cnpj')),
  clinica_id  uuid,
  user_id     uuid,
  email       text,
  razao       text,
  verificacao jsonb,
  criado_em   timestamptz not null default now()
);
alter table public.bs_identidades enable row level security;
drop policy if exists bs_identidades_ler on public.bs_identidades;
create policy bs_identidades_ler on public.bs_identidades
  for select to authenticated using (public.lm_e_mestre());

-- 6. Domínios de e-mail descartável
create table if not exists public.bs_dominios_bloqueados (
  dominio text primary key,
  criado_em timestamptz not null default now()
);
alter table public.bs_dominios_bloqueados enable row level security;
drop policy if exists bs_dominios_ler on public.bs_dominios_bloqueados;
create policy bs_dominios_ler on public.bs_dominios_bloqueados
  for select to authenticated using (public.lm_e_mestre());

insert into public.bs_dominios_bloqueados (dominio)
select d from (values
  ('mailinator.com'),('guerrillamail.com'),('10minutemail.com'),('tempmail.com'),
  ('temp-mail.org'),('throwawaymail.com'),('yopmail.com'),('getnada.com'),
  ('sharklasers.com'),('grr.la'),('dispostable.com'),('maildrop.cc'),
  ('fakeinbox.com'),('trashmail.com'),('mytemp.email'),('emailondeck.com'),
  ('mohmal.com'),('tempr.email'),('spamgourmet.com'),('mailnesia.com'),
  ('inboxkitten.com'),('tmpmail.org'),('minuteinbox.com'),('cortandoemails.com')
) t(d)
where not exists (select 1 from public.bs_dominios_bloqueados b where b.dominio = t.d);

-- 7. Colunas de identificação na clínica
alter table public.clinicas add column if not exists cpf_responsavel text;
alter table public.clinicas add column if not exists cnpj text;
alter table public.clinicas add column if not exists razao_social text;
alter table public.clinicas add column if not exists verificacao jsonb;
