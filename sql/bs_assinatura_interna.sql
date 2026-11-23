-- ---------------------------------------------------------------------------
-- BlackSolutions, assinatura fechada dentro do sistema
--
-- Tabelas que guardam a ligação de cada clínica com a cobrança, e o histórico
-- dos avisos recebidos do prestador. Nada de dado de cartão: o que fica é o
-- número da assinatura no prestador, a bandeira e os quatro últimos dígitos,
-- que servem só para a pessoa reconhecer o cartão na tela.
--
-- Rodar no editor de SQL do projeto. Pode rodar mais de uma vez.
-- ---------------------------------------------------------------------------

create table if not exists public.bs_assinaturas (
  clinica_id          uuid primary key references public.clinicas(id) on delete cascade,
  asaas_cliente       text,
  asaas_assinatura    text,
  asaas_cobranca      text,
  plano               text,
  valor               numeric(10,2),
  forma               text,
  status              text,
  cartao_mascara      text,
  proximo_vencimento  date,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  cancelado_em        timestamptz
);

create index if not exists bs_assinaturas_assin on public.bs_assinaturas(asaas_assinatura);

create table if not exists public.bs_assinatura_eventos (
  id          bigserial primary key,
  clinica_id  uuid references public.clinicas(id) on delete set null,
  evento      text,
  cobranca    text,
  valor       numeric(10,2),
  bruto       jsonb,
  em          timestamptz not null default now()
);

create index if not exists bs_assin_eventos_clinica on public.bs_assinatura_eventos(clinica_id, em desc);

-- Só o servidor escreve. O administrador da clínica lê apenas a linha dele,
-- e o registro de eventos não é aberto a ninguém pelo aplicativo.
alter table public.bs_assinaturas       enable row level security;
alter table public.bs_assinatura_eventos enable row level security;

drop policy if exists bs_assin_le_admin on public.bs_assinaturas;
create policy bs_assin_le_admin on public.bs_assinaturas
  for select to authenticated
  using (exists (select 1 from public.membros m
                  where m.clinica_id = bs_assinaturas.clinica_id
                    and m.user_id = auth.uid() and m.papel = 'admin'));

-- Conferência
select 'CONFERENCIA=' ||
       'assinaturas:' || (select count(*) from information_schema.tables
                           where table_schema='public' and table_name='bs_assinaturas')::text ||
       ' eventos:' || (select count(*) from information_schema.tables
                        where table_schema='public' and table_name='bs_assinatura_eventos')::text ||
       ' linhas:' || (select count(*) from public.bs_assinaturas)::text as resultado;

-- ---------------------------------------------------------------------------
-- Marca de liberação já feita, para o mesmo pagamento não estender a validade
-- duas vezes quando o prestador reenvia o aviso.
-- ---------------------------------------------------------------------------
alter table public.bs_assinatura_eventos add column if not exists liberou boolean not null default false;
create index if not exists bs_assin_eventos_cobranca on public.bs_assinatura_eventos(cobranca) where liberou;

select 'CONFERENCIA2=' ||
       'coluna_liberou:' || (select count(*) from information_schema.columns
                              where table_schema='public' and table_name='bs_assinatura_eventos'
                                and column_name='liberou')::text as resultado;
