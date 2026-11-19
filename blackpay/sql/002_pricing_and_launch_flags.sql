-- BlackPay 0.1.1 - política de precificação futura e chaves de ativação
-- O cliente não recebe credenciais financeiras nem realiza pagamentos reais.
begin;
create table if not exists blackpay.pricing_policies (
 organization_id uuid primary key references blackpay.organizations(id),
 customer_pix_send_fee_minor bigint not null default 0 check(customer_pix_send_fee_minor=0),
 customer_pix_receive_fee_minor bigint not null default 0 check(customer_pix_receive_fee_minor=0),
 debit_fee_bps integer check(debit_fee_bps between 0 and 10000),
 credit_fee_bps integer check(credit_fee_bps between 0 and 10000),
 acquiring_partner_confirmed boolean not null default false,
 enabled boolean not null default false check (enabled=false),
 updated_at timestamptz not null default now()
);
create table if not exists blackpay.launch_readiness (
 singleton boolean primary key default true check(singleton=true),
 company_registration_complete boolean not null default false,
 regulatory_path_validated boolean not null default false,
 financial_partner_contract_active boolean not null default false,
 provider_sandbox_tests_approved boolean not null default false,
 pci_applicability_reviewed boolean not null default false,
 kyc_aml_operational boolean not null default false,
 independent_security_audit_passed boolean not null default false,
 customer_real_money_access boolean not null default false check(customer_real_money_access=false),
 institution_code text,
 bank_agency text,
 created_at timestamptz not null default now(),
 modified_at timestamptz not null default now(),
 constraint no_fictitious_agency check(bank_agency is null or institution_code is not null)
);
insert into blackpay.launch_readiness(singleton) values(true) on conflict do nothing;
alter table blackpay.pricing_policies enable row level security;
alter table blackpay.launch_readiness enable row level security;
revoke all on blackpay.pricing_policies,blackpay.launch_readiness from public, anon, authenticated;
commit;