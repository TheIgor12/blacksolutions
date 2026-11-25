-- Candidata local, não aplicar em produção. Preserva rota e formato dos anexos anteriores.
begin;
alter table public.bf_anexos_clinicos
  add column if not exists foto_vista text,
  add column if not exists foto_expressao text,
  add column if not exists foto_original_sha256 text,
  add column if not exists foto_normalizada_sha256 text,
  add column if not exists foto_largura integer,
  add column if not exists foto_altura integer;

alter table public.bf_anexos_clinicos drop constraint if exists bf_foto_normalizada_formato;
alter table public.bf_anexos_clinicos add constraint bf_foto_normalizada_formato check (
 (foto_vista is null and foto_expressao is null and foto_original_sha256 is null and
  foto_normalizada_sha256 is null and foto_largura is null and foto_altura is null
  and split_part(storage_path,'/',3)<>'foto-clinica')
 or
 (foto_vista is not null and foto_vista in ('frontal','perfil_direito','perfil_esquerdo','obliqua_direita','obliqua_esquerda')
  and ((foto_vista='frontal' and foto_expressao is not null and foto_expressao in ('repouso','contracao'))
   or (foto_vista<>'frontal' and foto_expressao is null))
  and foto_original_sha256 is not null and foto_original_sha256 ~ '^[0-9a-f]{64}$'
  and foto_normalizada_sha256 is not null and foto_normalizada_sha256 ~ '^[0-9a-f]{64}$'
  and foto_largura is not null and foto_largura between 1 and 1600 and foto_altura is not null and foto_altura between 1 and 1600
  and tipo='fotografia' and mime_type='image/png'
  and storage_path=clinica_id::text || '/' || prontuario_id::text || '/foto-clinica/' || id::text || '.png')
) not valid;

-- A zona reservada não é gravável por clientes, mesmo com política permissiva antiga.
drop policy if exists bf_foto_clinica_marcador_protegido on public.bf_anexos_clinicos;
create policy bf_foto_clinica_marcador_protegido on public.bf_anexos_clinicos as restrictive
for insert to authenticated with check (foto_vista is null and split_part(storage_path,'/',3)<>'foto-clinica');

drop policy if exists bf_foto_clinica_objeto_protegido on storage.objects;
create policy bf_foto_clinica_objeto_protegido on storage.objects as restrictive
for insert to authenticated with check (bucket_id<>'bf-prontuarios' or split_part(name,'/',3)<>'foto-clinica');

-- O bloqueio se aplica também a políticas legadas de UPDATE/DELETE no Storage.
create policy bf_foto_clinica_objeto_imutavel on storage.objects as restrictive
for update to authenticated
using (bucket_id<>'bf-prontuarios' or split_part(name,'/',3)<>'foto-clinica')
with check (bucket_id<>'bf-prontuarios' or split_part(name,'/',3)<>'foto-clinica');
create policy bf_foto_clinica_objeto_sem_exclusao on storage.objects as restrictive
for delete to authenticated
using (bucket_id<>'bf-prontuarios' or split_part(name,'/',3)<>'foto-clinica');
create policy bf_foto_clinica_metadado_imutavel on public.bf_anexos_clinicos as restrictive
for update to authenticated
using (foto_vista is null and split_part(storage_path,'/',3)<>'foto-clinica')
with check (foto_vista is null and split_part(storage_path,'/',3)<>'foto-clinica');
create policy bf_foto_clinica_metadado_sem_exclusao on public.bf_anexos_clinicos as restrictive
for delete to authenticated using (foto_vista is null and split_part(storage_path,'/',3)<>'foto-clinica');

-- Acesso reservado depende de profissional de Biomedicina ativo e da ficha correspondente.
drop policy if exists bf_foto_clinica_leitura_metadado on public.bf_anexos_clinicos;
create policy bf_foto_clinica_leitura_metadado on public.bf_anexos_clinicos as restrictive
for select to authenticated using (
  foto_vista is null or (
    public.clinica_liberada(clinica_id)
    and exists(select 1 from public.bf_profissionais a where a.clinica_id=bf_anexos_clinicos.clinica_id
      and a.user_id=(select auth.uid()) and a.segmento='biomedicina' and a.ativo)
    and exists(select 1 from public.bf_prontuarios p where p.id=bf_anexos_clinicos.prontuario_id
      and p.clinica_id=bf_anexos_clinicos.clinica_id and p.segmento='biomedicina')
  )
);
drop policy if exists bf_foto_clinica_leitura_objeto on storage.objects;
create policy bf_foto_clinica_leitura_objeto on storage.objects as restrictive
for select to authenticated using (
  bucket_id<>'bf-prontuarios' or split_part(name,'/',3)<>'foto-clinica'
  or exists(select 1 from public.bf_anexos_clinicos f where f.storage_path=storage.objects.name and f.foto_vista is not null)
);

-- Somente a função de borda, após autenticar o token real no serviço Auth, informa o autor.
create or replace function public.bf_foto_clinica_pode_gravar(c uuid,p uuid,u uuid,r text)
returns boolean language sql security invoker stable set search_path='' as $$
 select coalesce(public.clinica_liberada(c),false) and exists (
  select 1 from public.bf_prontuarios f
  join public.membros m on m.clinica_id=f.clinica_id and m.user_id=u
  join public.bf_profissionais a on a.clinica_id=f.clinica_id and a.user_id=m.user_id and a.segmento=f.segmento
  where f.id=p and f.clinica_id=c and f.segmento='biomedicina' and a.ativo
    and f.paciente_ref=r and nullif(pg_catalog.btrim(r),'') is not null)
$$;
revoke all on function public.bf_foto_clinica_pode_gravar(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.bf_foto_clinica_pode_gravar(uuid,uuid,uuid,text) to service_role;

create or replace function public.bf_foto_clinica_registrada(c uuid,p uuid,u uuid,r text,f uuid,v text,e text,o text,h text,w integer,a integer)
returns uuid language plpgsql security invoker set search_path='' as $$
declare k text := c::text || '/' || p::text || '/foto-clinica/' || f::text || '.png';
begin
 perform 1 from public.bf_prontuarios x where x.clinica_id=c and x.id=p and x.paciente_ref=r for share;
 if not found or not public.bf_foto_clinica_pode_gravar(c,p,u,r) then
   raise exception 'Gravação clínica não autorizada.' using errcode='42501';
 end if;
 if not exists(select 1 from storage.objects x where x.bucket_id='bf-prontuarios' and x.name=k) then
   raise exception 'Arquivo normalizado não confirmado.' using errcode='22023';
 end if;
 insert into public.bf_anexos_clinicos(id,clinica_id,prontuario_id,tipo,nome_arquivo,storage_path,mime_type,criado_por,
  foto_vista,foto_expressao,foto_original_sha256,foto_normalizada_sha256,foto_largura,foto_altura)
 values(f,c,p,'fotografia','Foto clínica normalizada',k,'image/png',u,v,e,o,h,w,a);
 return f;
end $$;
revoke all on function public.bf_foto_clinica_registrada(uuid,uuid,uuid,text,uuid,text,text,text,text,integer,integer)
  from public,anon,authenticated;
grant execute on function public.bf_foto_clinica_registrada(uuid,uuid,uuid,text,uuid,text,text,text,text,integer,integer) to service_role;

commit;
select 'CONFERENCIA=' || count(*) from pg_catalog.pg_proc where oid='public.bf_foto_clinica_registrada(uuid,uuid,uuid,text,uuid,text,text,text,text,integer,integer)'::regprocedure;
