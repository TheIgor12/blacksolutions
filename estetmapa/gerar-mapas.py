"""Gera vistas e máscaras alinhadas. Não é atlas validado; revisar as regiões.
Uso: blender -b human_base_meshes_bundle.blend -t 4 --python gerar-mapas.py -- /destino
Origem CC0: https://download.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.2.0.zip
"""
import bpy
import math
import pathlib
import subprocess
import sys
from mathutils import Vector

dest = pathlib.Path(sys.argv[sys.argv.index('--') + 1]).resolve()
dest.mkdir(parents=True, exist_ok=True)
areas = ['fronte','glabela','periorbital','pes_galinha','dorso_nasal','ponta_nasal','sulco_nasogeniano','malar','zigomatico','labio_superior','labio_inferior','filtro','sulco_mentolabial','mentao','angulo_mandibular','submentoniana','pescoco','abdome','flanco','culote','face_interna_coxa','gluteo','braco']
objsrc = {n:bpy.data.objects[n] for n in ['GEO-head_animation_realistic','GEO-head_animation_realistic.sclera.L','GEO-head_animation_realistic.sclera.R','GEO-head_animation_realistic.iris.L','GEO-head_animation_realistic.iris.R','GEO-body_female_realistic']}
source = bpy.context.scene
s = bpy.data.scenes.new('Vistas originais para o BlackFlow')
bpy.context.window.scene = s
s.render.engine = 'CYCLES'
s.render.film_transparent = True
s.render.image_settings.color_mode = 'RGBA'
s.render.image_settings.file_format = 'PNG'
s.render.image_settings.color_depth = '8'
s.render.dither_intensity = 0
s.render.resolution_percentage = 100
s.cycles.samples = 10
s.cycles.use_denoising = False
s.view_settings.view_transform = 'Standard'
s.world = bpy.data.worlds.new('Estúdio')
s.world.use_nodes = True
s.world.node_tree.nodes.get('Background').inputs[0].default_value = (.67,.71,.87,1)
s.world.node_tree.nodes.get('Background').inputs[1].default_value = .37
cam = bpy.data.objects.new('Câmera', bpy.data.cameras.new('Câmera'))
s.collection.objects.link(cam)
s.camera = cam
cam.data.type = 'ORTHO'
def orient(o, pos, alvo):
    o.location = Vector(pos)
    o.rotation_euler = (Vector(alvo) - o.location).to_track_quat('-Z','Y').to_euler()
def lamp(name,pos,energy,size,c):
    a=bpy.data.lights.new(name,'AREA')
    a.energy=energy;a.size=size;a.color=c
    o=bpy.data.objects.new(name,a);s.collection.objects.link(o);orient(o,pos,(0,0,0))
lamp('Principal',(-2,-4,4),380,4,(1,.86,.76))
lamp('Preenchimento',(2,-1,2),160,3,(.68,.76,1))
lamp('Recorte',(0,2,2),250,3,(.82,.82,1))
def mat(nome, cor):
    m=bpy.data.materials.new(nome);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*cor,1);p.inputs['Roughness'].default_value=.52
    return m
pele=mat('Pele neutra',(.27,.119,.076))
labb=mat('Lábio',(.27,.093,.064))
sclera=mat('Olho',(.66,.56,.48))
iris=mat('Íris',(.087,.039,.016))
roupa=mat('Roupa de referência',(.14,.17,.24))
borda=mat('Pescoço',(.235,.10,.066))
def flat(ident):
    m=bpy.data.materials.new('Região '+str(ident));m.use_nodes=True
    ns=m.node_tree.nodes; ns.clear()
    e=ns.new('ShaderNodeEmission')
    e.inputs['Color'].default_value=(ident/255,91/255,167/255,1)
    out=ns.new('ShaderNodeOutputMaterial')
    m.node_tree.links.new(e.outputs[0],out.inputs[0])
    return m
zonas=[flat(0)]+[flat(i+1) for i in range(len(areas))]
def scene_obj(n, center, scale, sub=0):
    original=objsrc[n]
    coords=original.matrix_world.copy()
    obj=bpy.data.objects.new(n+' BlackFlow',original.data.copy())
    s.collection.objects.link(obj)
    center=Vector(center)
    for v in obj.data.vertices:v.co=(coords@v.co-center)*scale
    if sub:
        sm=obj.modifiers.new('Suavização','SUBSURF')
        sm.levels=sub;sm.render_levels=sub
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.modifier_apply(modifier=sm.name)
    for p in obj.data.polygons:p.use_smooth=True
    return obj
def face(v):
    # Coordenadas da malha Head - Realistic Animation, com a boca fechada.
    x,y,z=v; x=abs(x)
    if z<-.59:return 'pescoco'
    if z<-.40 and y<.10:return 'submentoniana'
    if y>.43:return None
    if z>.30 and y<-.38 and x<.55:return 'fronte'
    if z>.075 and z<.34 and x<.105 and y<-.45:return 'glabela'
    if .045<z<.29 and .15<x<.54 and y<-.34:
        return 'pes_galinha' if x>.36 else 'periorbital'
    if x<.108 and y<-.57 and -.12<z<.17:
        return 'ponta_nasal' if z<-.023 else 'dorso_nasal'
    if x<.066 and y<-.48 and -.221<z<=-.10:return 'filtro'
    if x<.265 and y<-.45 and -.30<z<=-.217:return 'labio_superior' if z>-.258 else 'labio_inferior'
    if x<.18 and y<-.36 and -.35<z<=-.30:return 'sulco_mentolabial'
    if x<.22 and y<-.34 and -.455<z<=-.35:return 'mentao'
    if .108<=x<.236 and -.23<z<.03 and y<-.47:return 'sulco_nasogeniano'
    if .236<=x<.43 and -.205<z<.03 and y<-.39:return 'malar'
    if x>=.43 and -.16<z<.075 and y<-.13:return 'zigomatico'
    if x>.25 and -.47<z<-.20 and y<.17:return 'angulo_mandibular'
    if z<-.40 and y<.02:return 'submentoniana'
    if z<-.45:return 'pescoco'
    return None
def body(v):
    x,y,z=v;a=abs(x)
    if z>.68 and z<.79:return 'pescoco'
    if z>=.79 and z<.88 and y<-.045:return 'submentoniana'
    if a>.205 and z>.36:return 'braco'
    if .20<z<.48 and a>.088:return 'flanco'
    if .17<z<.51 and a<=.09 and y<0:return 'abdome'
    if -.09<z<.18 and y>.015:return 'gluteo' if a<.165 else 'culote'
    if -.18<z<.16 and a>.13:return 'culote'
    if -.25<z<.055 and .025<a<.09 and y<.025:return 'face_interna_coxa'
    return None
def assign(obj, classifier, is_mask):
    obj.data.materials.clear()
    if is_mask:
        for m in zonas: obj.data.materials.append(m)
        for p in obj.data.polygons:
            area=classifier(p.center)
            p.material_index=areas.index(area)+1 if area in areas else 0
    else:
        if classifier==face:
            for m in [pele,labb,borda]: obj.data.materials.append(m)
            for p in obj.data.polygons:
                roi=classifier(p.center)
                p.material_index=1 if roi in ('labio_superior','labio_inferior') else 2 if roi=='pescoco' else 0
        else:
            obj.data.materials.append(roupa)
            for p in obj.data.polygons:p.material_index=0
def render_view(chave, o, classifier, group, angle, target, scale, w, h):
    s.render.resolution_x=w;s.render.resolution_y=h
    cam.data.ortho_scale=scale
    orient(cam,(3*math.sin(angle),-3*math.cos(angle),target[2]+.022),target)
    for g in s.objects:
        if g.type=='MESH':g.hide_render=g not in group
    assign(o,classifier,False)
    for g in group[1:]:
        g.data.materials.clear()
        g.data.materials.append(iris if '.iris.' in g.name else sclera)
        for p in g.data.polygons:p.material_index=0
    s.view_settings.view_transform='Standard';s.cycles.samples=24;s.cycles.use_denoising=False
    s.render.filepath=str(dest/(chave+'.png'))
    bpy.ops.render.render(write_still=True)
    # Sem correção gama, sem interpolação de visualização e sem suavizar a máscara.
    assign(o,classifier,True)
    for g in group[1:]:g.hide_render=True
    s.cycles.samples=1;s.cycles.use_denoising=False;s.view_settings.view_transform='Raw'
    s.cycles.filter_width=.01
    s.render.filepath=str(dest/('mapa-'+chave+'.png'))
    bpy.ops.render.render(write_still=True)
    s.cycles.filter_width=1.5
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(dest/(chave+'.png')),'-c:v','libwebp','-quality','88',str(dest/(chave+'.webp'))],check=True)
    (dest/(chave+'.png')).unlink()

head=scene_obj('GEO-head_animation_realistic',(1.4627,-.028,.716),6,1)
other=[scene_obj(n,(1.4627,-.028,.716),6) for n in objsrc if '.iris.' in n or '.sclera.' in n]
# Dar folga à íris à frente da esfera e colorir a pupila no próprio disco.
for obj in other:
    if '.iris.' not in obj.name: continue
    for v in obj.data.vertices:v.co.y -= .021
o=scene_obj('GEO-body_female_realistic',(-1.3401,-.025,.745),1,1)
for chave, ang in [('frontal',0),('obliqua_direita',-38),('obliqua_esquerda',38),('perfil_direito',-90),('perfil_esquerdo',90)]:
    render_view(chave,head,face,[head]+other,math.radians(ang),(0,0,-.12),2.42,340,390)
for chave,ang in [('corpo_frente',0),('corpo_costas',180)]:
    render_view(chave,o,body,[o],math.radians(ang),(0,0,.076),1.83,340,390)
