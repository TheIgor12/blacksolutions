-- BlackFlow: prova da assinatura eletronica (hash, auditoria e conferencia de identidade)
-- Rode este script inteiro uma unica vez no SQL Editor do Supabase.

create extension if not exists pgcrypto with schema extensions;

alter table public.assinaturas
  add column if not exists hash_texto    text,
  add column if not exists ip_assinatura text,
  add column if not exists agente        text,
  add column if not exists aberto_em     timestamptz,
  add column if not exists ip_abertura   text,
  add column if not exists confere_tipo  text,
  add column if not exists confere_hash  text,
  add column if not exists tentativas    integer not null default 0;

-- Endereco de rede real de quem acessou, lido do cabecalho da requisicao
create or replace function public.bs_ip() returns text
language sql stable as $$
  select nullif(btrim(split_part(coalesce(current_setting('request.headers',true)::json->>'x-forwarded-for',''),',',1)),'')
$$;

create or replace function public.bs_agente() returns text
language sql stable as $$
  select nullif(left(coalesce(current_setting('request.headers',true)::json->>'user-agent',''),300),'')
$$;

-- Abre o termo e registra o momento da abertura
create or replace function public.termo_abrir(p_token uuid)
returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  t public.assinaturas%rowtype;
  v_criado timestamptz;
begin
  select * into t from public.assinaturas where token = p_token;
  if not found then return null; end if;

  v_criado := nullif(coalesce(to_jsonb(t)->>'criado_em', to_jsonb(t)->>'created_at'),'')::timestamptz;

  if t.aberto_em is null then
    update public.assinaturas
       set aberto_em = now(), ip_abertura = public.bs_ip()
     where token = p_token;
    t.aberto_em := now();
  end if;

  return json_build_object(
    'titulo',       t.titulo,
    'texto',        t.texto,
    'clinica',      t.clinica_nome,
    'paciente',     t.paciente,
    'assinado',     t.assinado_em is not null,
    'expirado',     v_criado is not null and v_criado < now() - interval '30 days',
    'bloqueado',    coalesce(t.tentativas,0) >= 8,
    'confere_tipo', coalesce(t.confere_tipo,''),
    'aberto_em',    t.aberto_em
  );
end $$;

-- Assina: confere a identidade, calcula o hash do texto e grava o rastro tecnico
create or replace function public.termo_assinar(
  p_token uuid, p_assinatura text, p_nome text, p_confere text default null)
returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  t public.assinaturas%rowtype;
  v_hash text;
  v_esperado text;
begin
  select * into t from public.assinaturas where token = p_token;
  if not found then return json_build_object('ok',false,'erro','nao_encontrado'); end if;
  if t.assinado_em is not null then return json_build_object('ok',false,'erro','ja_assinado'); end if;
  if coalesce(t.tentativas,0) >= 8 then return json_build_object('ok',false,'erro','bloqueado'); end if;
  if length(coalesce(p_assinatura,'')) < 200 then return json_build_object('ok',false,'erro','sem_assinatura'); end if;
  if length(btrim(coalesce(p_nome,''))) < 4 then return json_build_object('ok',false,'erro','sem_nome'); end if;

  if nullif(t.confere_hash,'') is not null then
    v_esperado := encode(extensions.digest(
      coalesce(t.termo_id,'') || ':' || regexp_replace(coalesce(p_confere,''),'[^0-9]','','g'),
      'sha256'),'hex');
    if v_esperado is distinct from t.confere_hash then
      update public.assinaturas set tentativas = coalesce(tentativas,0)+1 where token = p_token;
      return json_build_object('ok',false,'erro','confere',
        'restam', greatest(0, 8 - (coalesce(t.tentativas,0)+1)));
    end if;
  end if;

  v_hash := encode(extensions.digest(coalesce(t.texto,''),'sha256'),'hex');

  update public.assinaturas
     set assinatura    = p_assinatura,
         nome_assinou  = left(btrim(p_nome),120),
         assinado_em   = now(),
         hash_texto    = v_hash,
         ip_assinatura = public.bs_ip(),
         agente        = public.bs_agente()
   where token = p_token;

  return json_build_object('ok',true,'hash',v_hash);
end $$;

grant execute on function public.termo_abrir(uuid)                       to anon, authenticated;
grant execute on function public.termo_assinar(uuid,text,text,text)      to anon, authenticated;
grant execute on function public.bs_ip()                                 to anon, authenticated;
grant execute on function public.bs_agente()                             to anon, authenticated;

select 'pronto' as resultado;
