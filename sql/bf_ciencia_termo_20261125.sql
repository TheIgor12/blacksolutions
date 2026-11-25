-- Novo termo apenas. Usar depois da porta de laboratório em ambiente de teste.
-- Não grava em public.assinaturas nem reutiliza o caminho público de termos antigos.
begin;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists bf_consentimento_privado;
revoke all on schema bf_consentimento_privado from public,anon,authenticated;
create table bf_consentimento_privado.pedidos (
 id uuid primary key default gen_random_uuid(),
 clinica uuid not null,
 ficha uuid not null,
 paciente_ref text not null,
 signatario uuid not null references auth.users(id),
 conferente uuid not null references auth.users(id),
 versao text not null,
 hash_texto text not null check(hash_texto ~ '^[0-9a-f]{64}$'),
 hash_codigo text not null unique check(hash_codigo ~ '^[0-9a-f]{64}$'),
 conferido_em timestamptz not null default statement_timestamp(),
 expira_em timestamptz not null,
 revogado_em timestamptz,
 check(signatario<>conferente),
 check(expira_em>conferido_em)
);
create table bf_consentimento_privado.provas (
 id uuid primary key default gen_random_uuid(),
 pedido_id uuid not null unique references bf_consentimento_privado.pedidos(id),
 imagem_assinatura bytea not null check(octet_length(imagem_assinatura) between 100 and 131072),
 hash_assinatura text not null check(hash_assinatura ~ '^[0-9a-f]{64}$'),
 hash_envelope text not null check(hash_envelope ~ '^[0-9a-f]{64}$'),
 sessao uuid not null,
 assinado_em timestamptz not null
);
create index bf_ciencia_por_ficha on bf_consentimento_privado.pedidos(clinica,ficha,signatario);
alter table bf_consentimento_privado.pedidos enable row level security;
alter table bf_consentimento_privado.provas enable row level security;
revoke all on bf_consentimento_privado.pedidos,bf_consentimento_privado.provas from public,anon,authenticated;

create function bf_consentimento_privado.texto_v1() returns text language sql immutable set search_path='' as $$
select 'Termo de ciência sobre simulação facial ilustrativa. A imagem é uma ilustração, não prevê o resultado e não é promessa ou compromisso de resultado. O resultado real varia de pessoa para pessoa. A imagem da simulação não integra o prontuário. Esta assinatura registra minha ciência sobre a ilustração e não autoriza procedimentos, não substitui consentimento de tratamento e não permite usar a imagem em divulgação. Posso recusar ou revogar a autorização para novas simulações, sem prejuízo ao atendimento.'::text
$$;

create function bf_consentimento_privado.pode_conferir(c uuid,f uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null
 and public.clinica_liberada(c) is true
 and public.bf_e_clinico(c) is true
 and exists(select 1 from public.bf_prontuarios p join public.bf_profissionais pr on pr.clinica_id=p.clinica_id and pr.segmento=p.segmento
 where p.clinica_id=c and p.id=f and p.segmento='biomedicina' and pr.user_id=auth.uid() and pr.ativo)
$$;

create function bf_consentimento_privado.sessao_verificada() returns uuid
language sql stable security definer set search_path='' as $$
 select s.id from auth.sessions s join auth.users u on u.id=s.user_id
 where s.user_id=auth.uid() and s.id::text=auth.jwt()->>'session_id'
 and u.email_confirmed_at is not null and u.is_anonymous is false
 and (u.banned_until is null or u.banned_until<=statement_timestamp())
 and (s.not_after is null or s.not_after>statement_timestamp())
$$;

create function bf_consentimento_privado.envelope(q bf_consentimento_privado.pedidos, b text, s uuid, t timestamptz) returns text
language sql stable set search_path='' as $$
 select encode(extensions.digest(jsonb_build_array(q.id,q.clinica,q.ficha,q.paciente_ref,q.signatario,q.conferente,q.versao,q.hash_texto,b,s,extract(epoch from q.conferido_em),extract(epoch from t))::text,'sha256'),'hex')
$$;

-- A profissional declara verificação presencial; não digita CPF nem anexa documento.
-- A segunda identidade é a conta já confirmada e presente da pessoa na clínica.
create function public.bf_ciencia_emitir(p_clinica uuid,p_prontuario uuid,p_conta uuid,p_identidade_conferida boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_prof uuid:=auth.uid(); v_ref text; v_codigo text; v_id uuid;
 v_exp timestamptz:=statement_timestamp()+interval '15 minutes';
 v_text text:=bf_consentimento_privado.texto_v1(); v_hash text;
begin
 if p_identidade_conferida is distinct from true or p_conta is null or p_conta=v_prof
 or bf_consentimento_privado.sessao_verificada() is null
 or bf_consentimento_privado.pode_conferir(p_clinica,p_prontuario) is distinct from true
 or not exists(select 1 from auth.users u where u.id=p_conta and u.email_confirmed_at is not null and u.is_anonymous is false
 and (u.banned_until is null or u.banned_until<=statement_timestamp()))
 or exists(select 1 from public.membros m where m.clinica_id=p_clinica and m.user_id=p_conta) then
   raise exception 'Não foi possível emitir o termo de ciência.' using errcode='42501';
 end if;
 -- A ordem de lock é sempre ficha, depois pedido.
 select p.paciente_ref into v_ref from public.bf_prontuarios p
 where p.id=p_prontuario and p.clinica_id=p_clinica and p.segmento='biomedicina' for update;
 if nullif(btrim(v_ref),'') is null then raise exception 'Não foi possível emitir o termo de ciência.' using errcode='42501'; end if;
 if exists(select 1 from bf_consentimento_privado.pedidos p join bf_consentimento_privado.provas s on s.pedido_id=p.id
   where p.clinica=p_clinica and p.ficha=p_prontuario and p.paciente_ref=v_ref and p.revogado_em is null and p.versao='bf-ciencia-simulacao-ilustrativa-v1') then
   raise exception 'Já existe termo vigente nesta ficha. Não reemita sem revogá-lo.' using errcode='22023';
 end if;
 update bf_consentimento_privado.pedidos set revogado_em=statement_timestamp()
 where clinica=p_clinica and ficha=p_prontuario and revogado_em is null;
 v_codigo:=encode(extensions.gen_random_bytes(32),'hex');v_hash:=encode(extensions.digest(v_text,'sha256'),'hex');
 insert into bf_consentimento_privado.pedidos(clinica,ficha,paciente_ref,signatario,conferente,versao,hash_texto,hash_codigo,expira_em)
 values(p_clinica,p_prontuario,v_ref,p_conta,v_prof,'bf-ciencia-simulacao-ilustrativa-v1',v_hash,encode(extensions.digest(v_codigo,'sha256'),'hex'),v_exp) returning id into v_id;
 return jsonb_build_object('pedido',v_id,'codigo',v_codigo,'expira_em',v_exp);
end $$;

create function public.bf_ciencia_ler(p_codigo text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w bf_consentimento_privado.pedidos%rowtype; v_txt text:=bf_consentimento_privado.texto_v1();
begin
 if p_codigo is null or p_codigo !~ '^[0-9a-f]{64}$' or bf_consentimento_privado.sessao_verificada() is null then return null; end if;
 select p.* into w from bf_consentimento_privado.pedidos p
 where p.hash_codigo=encode(extensions.digest(p_codigo,'sha256'),'hex') and p.signatario=auth.uid() and p.expira_em>statement_timestamp()
 and p.revogado_em is null and p.versao='bf-ciencia-simulacao-ilustrativa-v1' and p.hash_texto=encode(extensions.digest(v_txt,'sha256'),'hex')
 and not exists(select 1 from bf_consentimento_privado.provas z where z.pedido_id=p.id)
 and exists(select 1 from public.bf_prontuarios f where f.id=p.ficha and f.clinica_id=p.clinica and f.paciente_ref=p.paciente_ref and f.segmento='biomedicina');
 if not found then return null; end if;
 return jsonb_build_object('versao',w.versao,'hash',w.hash_texto,'texto',v_txt,'expira_em',w.expira_em);
end $$;

create function public.bf_ciencia_assinar(p_codigo text,p_hash_texto text,p_png text)
returns uuid language plpgsql security definer set search_path='' as $$
declare w bf_consentimento_privado.pedidos%rowtype; v_png bytea; v_hash text; v_id uuid;
 v_sess uuid:=bf_consentimento_privado.sessao_verificada(); v_hora timestamptz:=statement_timestamp(); v_ref text;
begin
 if v_sess is null or p_codigo is null or p_codigo !~ '^[0-9a-f]{64}$' or p_hash_texto is null or p_hash_texto !~ '^[0-9a-f]{64}$'
 or p_png is null or length(p_png) not between 136 and 174764 or p_png !~ '^[A-Za-z0-9+/]+={0,2}$' then
 raise exception 'Não foi possível assinar o termo.' using errcode='42501';
 end if;
 select p.* into w from bf_consentimento_privado.pedidos p where p.hash_codigo=encode(extensions.digest(p_codigo,'sha256'),'hex') and p.signatario=auth.uid();
 if not found then raise exception 'Não foi possível assinar o termo.' using errcode='42501';end if;
 select p.paciente_ref into v_ref from public.bf_prontuarios p
 where p.id=w.ficha and p.clinica_id=w.clinica and p.segmento='biomedicina' for share;
 if not found or v_ref is distinct from w.paciente_ref or public.clinica_liberada(w.clinica) is distinct from true then
 raise exception 'Não foi possível assinar o termo.' using errcode='42501';end if;
 select p.* into w from bf_consentimento_privado.pedidos p where p.id=w.id for update;
 if not found or w.revogado_em is not null or w.expira_em<=v_hora or w.hash_texto is distinct from p_hash_texto
 or w.versao<>'bf-ciencia-simulacao-ilustrativa-v1' or w.hash_texto<>encode(extensions.digest(bf_consentimento_privado.texto_v1(),'sha256'),'hex')
 or exists(select 1 from public.membros m where m.clinica_id=w.clinica and m.user_id=auth.uid()) then
 raise exception 'Não foi possível assinar o termo.' using errcode='42501';end if;
 begin v_png:=decode(p_png,'base64'); exception when others then
   raise exception 'Assinatura inválida.' using errcode='22023';
 end;
 if octet_length(v_png) not between 100 and 131072
 or substring(v_png from 1 for 16)<>decode('89504e470d0a1a0a0000000d49484452','hex')
 or substring(v_png from octet_length(v_png)-11 for 12)<>decode('0000000049454e44ae426082','hex') then
 raise exception 'Assinatura inválida.' using errcode='22023';end if;
 v_hash:=encode(extensions.digest(v_png,'sha256'),'hex');
 insert into bf_consentimento_privado.provas(pedido_id,imagem_assinatura,hash_assinatura,hash_envelope,sessao,assinado_em)
 values(w.id,v_png,v_hash,bf_consentimento_privado.envelope(w,v_hash,v_sess,v_hora),v_sess,v_hora)
 on conflict (pedido_id) do nothing returning id into v_id;
 if v_id is null then raise exception 'O termo já foi assinado.' using errcode='22023';end if;
 return v_id;
end $$;

-- Revogação preserva a trilha; o recibo devolvido ao paciente não expõe o documento.
create function public.bf_ciencia_revogar(p_recibo uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare a bf_consentimento_privado.pedidos%rowtype;
begin
 if bf_consentimento_privado.sessao_verificada() is null then return false;end if;
 select w.* into a from bf_consentimento_privado.pedidos w join bf_consentimento_privado.provas z on z.pedido_id=w.id where z.id=p_recibo;
 if not found or (a.signatario is distinct from auth.uid() and bf_consentimento_privado.pode_conferir(a.clinica,a.ficha) is distinct from true) then return false;end if;
 update bf_consentimento_privado.pedidos set revogado_em=coalesce(revogado_em,statement_timestamp()) where id=a.id;
 return true;
end $$;

create or replace function bf_auditoria_interna.evidencia_ciencia_simulacao(c uuid,f uuid,r text,v text)
returns uuid language plpgsql volatile security definer set search_path='' as $$
declare ret uuid;
begin
 select s.id into ret from bf_consentimento_privado.pedidos w join bf_consentimento_privado.provas s on s.pedido_id=w.id
 join auth.users u on u.id=w.signatario
 where w.clinica=c and w.ficha=f and w.paciente_ref=r and w.versao=v and w.revogado_em is null
 and u.email_confirmed_at is not null and not u.is_anonymous
 and u.deleted_at is null
 and w.hash_texto=encode(extensions.digest(bf_consentimento_privado.texto_v1(),'sha256'),'hex')
 and s.hash_assinatura=encode(extensions.digest(s.imagem_assinatura,'sha256'),'hex')
 and s.hash_envelope=bf_consentimento_privado.envelope(w,s.hash_assinatura,s.sessao,s.assinado_em)
 order by s.assinado_em desc limit 1 for share of w;
 return ret;
end $$;
revoke all on all functions in schema bf_consentimento_privado from public,anon,authenticated;
revoke all on function bf_auditoria_interna.evidencia_ciencia_simulacao(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.bf_ciencia_emitir(uuid,uuid,uuid,boolean), public.bf_ciencia_ler(text), public.bf_ciencia_assinar(text,text,text), public.bf_ciencia_revogar(uuid) from public,anon,authenticated;
grant execute on function public.bf_ciencia_emitir(uuid,uuid,uuid,boolean), public.bf_ciencia_ler(text), public.bf_ciencia_assinar(text,text,text), public.bf_ciencia_revogar(uuid) to authenticated;
commit;
