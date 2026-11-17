-- =====================================================================
-- Validacao publica de documento assinado
--
-- Permite que qualquer pessoa, sem conta e sem acesso ao sistema, confira
-- se um documento assinado existe e nao foi alterado. E o que torna a
-- assinatura verificavel por terceiro: cartorio, juizo ou a propria cliente.
--
-- Nao devolve o texto do documento nem dado de saude. Devolve so o que
-- prova autenticidade: titulo, quem assinou com o nome parcialmente
-- encoberto, quando abriu, quando assinou e o codigo.
--
-- Rodar uma vez no SQL Editor do Supabase. E seguro rodar de novo.
-- =====================================================================

create or replace function public.documento_validar(p_codigo text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cod text;
  t public.assinaturas%rowtype;
  v_nome text;
  v_partes text[];
  i int;
begin
  -- aceita o codigo colado com espacos, quebras de linha ou em maiusculas
  v_cod := lower(regexp_replace(coalesce(p_codigo,''), '[^0-9A-Fa-f]', '', 'g'));

  if length(v_cod) < 16 then
    return json_build_object('ok', false, 'erro', 'curto');
  end if;

  -- aceita o codigo inteiro de 64 caracteres ou so o comeco, com no minimo 16
  select * into t
    from public.assinaturas
   where assinado_em is not null
     and hash_texto is not null
     and hash_texto like v_cod || '%'
   limit 2;

  if not found then
    return json_build_object('ok', false, 'erro', 'nao_encontrado');
  end if;

  -- encobre o nome: primeiro e ultimo sobrenome inteiros, o resto por inicial
  v_partes := regexp_split_to_array(btrim(coalesce(t.nome_assinou, t.paciente, '')), '\s+');
  v_nome := '';
  for i in 1 .. coalesce(array_length(v_partes, 1), 0) loop
    if i = 1 or i = array_length(v_partes, 1) then
      v_nome := v_nome || v_partes[i] || ' ';
    else
      v_nome := v_nome || left(v_partes[i], 1) || '. ';
    end if;
  end loop;

  return json_build_object(
    'ok', true,
    'titulo', t.titulo,
    'assinante', btrim(v_nome),
    'clinica', t.clinica_nome,
    'aberto_em', t.aberto_em,
    'assinado_em', t.assinado_em,
    'codigo', t.hash_texto,
    'conferiu_identidade', (nullif(t.confere_tipo, '') is not null),
    'tipo_conferido', t.confere_tipo
  );
end;
$$;

revoke all on function public.documento_validar(text) from public;
grant execute on function public.documento_validar(text) to anon, authenticated;

comment on function public.documento_validar(text) is
  'Confere publicamente um documento assinado pelo codigo SHA-256. Nao expoe o texto nem dado de saude.';
