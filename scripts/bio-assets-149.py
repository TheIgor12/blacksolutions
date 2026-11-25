"""Confere dimensões, paleta e cobertura das 23 regiões em todos os ativos locais."""
from PIL import Image
from pathlib import Path
from collections import Counter

p=Path(__file__).resolve().parents[1]/'estetmapa'
nomes='frontal obliqua_direita obliqua_esquerda perfil_direito perfil_esquerdo corpo_frente corpo_costas'.split()
regioes=set()
for nome in nomes:
    figura=Image.open(p/(nome+'.webp')).convert('RGBA')
    mapa=Image.open(p/('mapa-'+nome+'.png')).convert('RGBA')
    assert figura.size==mapa.size==(340,390),nome
    pixels=Counter(mapa.getdata())
    achados={r:q for (r,g,b,a),q in pixels.items() if g==91 and b==167 and a==255 and r>0}
    assert achados, nome
    assert all(1<=r<=23 for r in achados), nome
    assert sum(achados.values())>=1000, nome
    juntas=list(zip(figura.getdata(),mapa.getdata()))
    tinta=sum(1 for f,(r,g,b,a) in juntas if f[3]>0 and r>0 and g==91 and b==167 and a==255)
    assert tinta/sum(achados.values())>.996, nome
    regioes.update(achados)
    print(nome, len(achados),'regiões desenhadas,',tinta,'pixels de máscara coincidem com a figura.')
assert regioes==set(range(1,24))
