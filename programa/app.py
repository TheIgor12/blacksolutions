"""
BlackFlow, by BlackSolutions
Programa para Windows que abre o sistema de gestão da clínica em uma janela própria,
guarda os dados do navegador interno na pasta do usuário e se atualiza sozinho
pelas versões publicadas no GitHub.
"""
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

import webview

APP_NOME = 'BlackFlow'
VERSAO = '1.6.1'
# Arquivo público que informa a versão mais nova. Fica no repositório do site Black Solutions.
URL_VERSAO = 'https://raw.githubusercontent.com/TheIgor12/blacksolutions/main/versao.json'
ARQ_HTML = 'happyfeet-gestao.html'
NOME_EXE = 'BlackFlow.exe'
NOME_INSTALADOR = 'BlackFlow_Instalador.exe'

BASE = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent))
# A pasta de dados mantém o nome antigo para não perder o login e os dados de quem já usa.
NO_MAC = sys.platform == 'darwin'
if NO_MAC:
    PASTA = Path.home() / 'Library' / 'Application Support' / 'BlackFlow'
else:
    PASTA = Path(os.environ.get('APPDATA') or Path.home()) / 'HappyFEETGestao'
PASTA_APP = PASTA / 'app'
ARQ_INFO = PASTA / 'versao.json'

janela = None


def numeros_versao(texto):
    return tuple(int(n) for n in re.findall(r'\d+', str(texto or '0'))[:4]) or (0,)


def ler_info():
    try:
        return json.loads(ARQ_INFO.read_text(encoding='utf-8'))
    except Exception:
        return {}


def gravar_info(info):
    PASTA.mkdir(parents=True, exist_ok=True)
    ARQ_INFO.write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding='utf-8')


def versao_atual():
    return max(VERSAO, ler_info().get('html', '0'), key=numeros_versao)


def preparar_html():
    """Copia a tela do sistema para a pasta do usuário. O endereço fica sempre o mesmo,
    o que mantém o login e os dados salvos entre uma abertura e outra."""
    PASTA_APP.mkdir(parents=True, exist_ok=True)
    destino = PASTA_APP / ARQ_HTML
    info = ler_info()
    if not destino.exists() or numeros_versao(VERSAO) > numeros_versao(info.get('html', '0')):
        shutil.copyfile(BASE / ARQ_HTML, destino)
        info['html'] = VERSAO
        gravar_info(info)
    return destino


class Api:
    """Funções que a tela do sistema pode chamar."""

    def __init__(self):
        self._planilhas = []

    def salvar_arquivo(self, nome, conteudo_base64):
        """Salva um arquivo criado pelo sistema (backup, cópia em Excel, modelo).
        Não deixa gravar por cima de um arquivo com outro nome sem um aviso claro,
        para não estragar, por engano, as planilhas exportadas de outro sistema."""
        tipo_salvar = getattr(webview, 'SAVE_DIALOG', None)
        if tipo_salvar is None:
            tipo_salvar = webview.FileDialog.SAVE
        escolha = janela.create_file_dialog(tipo_salvar, save_filename=nome)
        if not escolha:
            return ''
        caminho = Path(escolha if isinstance(escolha, str) else escolha[0])
        if caminho.exists() and caminho.name.lower() != str(nome).lower():
            aviso = (f'O arquivo {caminho.name} já existe e será APAGADO e trocado por uma cópia criada pelo {APP_NOME}.\n\n'
                     'Este botão serve para SALVAR uma cópia, e não para importar planilhas. '
                     'Para importar, use o botão Selecionar os arquivos, na tela Importar dados.\n\n'
                     'Deseja mesmo apagar o arquivo antigo?')
            if not janela.create_confirmation_dialog('Cuidado: arquivo será substituído', aviso):
                return ''
        caminho.write_bytes(base64.b64decode(conteudo_base64))
        return str(caminho)

    def escolher_planilhas(self):
        """Abre a janela do Windows para escolher várias planilhas de uma vez (Ctrl e A seleciona todas)."""
        tipo_abrir = getattr(webview, 'OPEN_DIALOG', None)
        if tipo_abrir is None:
            tipo_abrir = webview.FileDialog.OPEN
        escolha = janela.create_file_dialog(
            tipo_abrir, allow_multiple=True,
            file_types=('Planilhas (*.xlsx;*.xlsm;*.xls;*.csv;*.ods)', 'Todos os arquivos (*.*)'))
        if not escolha:
            return []
        lista = [escolha] if isinstance(escolha, str) else list(escolha)
        self._planilhas = [Path(c) for c in lista]
        return [{'nome': c.name, 'tamanho': c.stat().st_size} for c in self._planilhas]

    def ler_planilha(self, indice):
        """Entrega o conteúdo de uma das planilhas escolhidas, uma por vez."""
        return base64.b64encode(self._planilhas[int(indice)].read_bytes()).decode('ascii')

    def chamar_atencao(self):
        """Traz a janela para a frente quando chega a hora de um atendimento."""
        try:
            janela.restore()
            janela.show()
            janela.on_top = True
            time.sleep(1.5)
            janela.on_top = False
        except Exception:
            pass

    def atualizar(self):
        """Botão Atualizar agora, dentro do sistema."""
        try:
            r = verificar_atualizacoes(perguntar=False)
            return r or 'atualizado'
        except Exception as erro:
            return 'erro: ' + str(erro)

    def abrir_link(self, url):
        if str(url).startswith(('https://', 'http://', 'mailto:')):
            webbrowser.open(url)

    def versao(self):
        return {'app': versao_atual(), 'programa': VERSAO}


# ----------------------------------------------------------------------------
# Atualização automática
# ----------------------------------------------------------------------------
def requisicao(url):
    return urllib.request.Request(url, headers={'Accept': 'application/vnd.github+json',
                                                'User-Agent': 'BlackFlow-Atualizador'})


def buscar_ultima_versao():
    """Lê o versao.json publicado no site. Formato:
    {"versao": "1.2.1", "instalador": "https://...exe", "html": "https://...html", "novidades": "texto"}"""
    with urllib.request.urlopen(requisicao(URL_VERSAO + '?t=' + str(int(time.time()))), timeout=15) as resposta:
        return json.load(resposta)


def baixar(url, destino):
    temporario = Path(str(destino) + '.parcial')
    with urllib.request.urlopen(requisicao(url), timeout=120) as resposta, open(temporario, 'wb') as saida:
        shutil.copyfileobj(resposta, saida)
    os.replace(temporario, destino)


def instalar_atualizacao(instalador):
    """Fecha o programa e roda o instalador novo em modo silencioso.
    O próprio instalador substitui os arquivos e abre o programa de novo."""
    sem_janela = 0x00000008  # DETACHED_PROCESS
    subprocess.Popen([str(instalador), '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/CLOSEAPPLICATIONS'],
                     creationflags=sem_janela, close_fds=True)
    janela.destroy()


def verificar_atualizacoes(perguntar=True):
    if perguntar:
        time.sleep(4)
    try:
        versao = buscar_ultima_versao()
    except Exception as erro:
        if not perguntar:
            raise RuntimeError('sem conexão com o servidor de atualizações') from erro
        return  # sem internet ou sem versões publicadas: segue normalmente
    nova = str(versao.get('versao', '')).lstrip('vV')
    if numeros_versao(nova) <= numeros_versao(versao_atual()):
        return 'atual'
    arquivos = {NOME_INSTALADOR: versao.get('instalador'), ARQ_HTML: versao.get('html')}
    notas = (versao.get('novidades') or '').strip()
    texto = f'A versão {nova} do {APP_NOME} está disponível.'
    if notas:
        texto += '\n\nNovidades:\n' + notas[:600]
    try:
        if getattr(sys, 'frozen', False) and not NO_MAC and arquivos.get(NOME_INSTALADOR):
            if perguntar and not janela.create_confirmation_dialog('Atualização disponível', texto + '\n\nAtualizar agora? O programa vai fechar e abrir de novo sozinho.'):
                return
            instalador = Path(tempfile.gettempdir()) / ('BlackFlow_Instalador_' + nova + '.exe')
            baixar(arquivos[NOME_INSTALADOR], instalador)
            instalar_atualizacao(instalador)
        elif arquivos.get(ARQ_HTML):
            if perguntar and not janela.create_confirmation_dialog('Atualização disponível', texto + '\n\nAtualizar agora?'):
                return
            destino = PASTA_APP / ARQ_HTML
            temporario = PASTA_APP / (ARQ_HTML + '.novo')
            # O endereço muda a cada tentativa para não receber uma cópia antiga guardada pelo GitHub.
            baixar(arquivos[ARQ_HTML] + '?t=' + str(int(time.time())), temporario)
            if ('Versão ' + nova) not in temporario.read_text(encoding='utf-8', errors='ignore'):
                temporario.unlink(missing_ok=True)
                raise RuntimeError('o servidor ainda está entregando a versão anterior. Feche e abra o programa daqui a alguns minutos')
            os.replace(temporario, destino)
            info = ler_info()
            info['html'] = nova
            gravar_info(info)
            janela.load_url(destino.as_uri())
            return 'atualizado'
    except Exception as erro:
        if not perguntar:
            raise
        try:
            janela.evaluate_js(f"toast({json.dumps('Não foi possível atualizar agora: ' + str(erro))})")
        except Exception:
            pass


def iniciar():
    global janela
    pagina = preparar_html()
    try:
        webview.settings['ALLOW_DOWNLOADS'] = True
    except Exception:
        pass
    janela = webview.create_window(APP_NOME, url=pagina.as_uri(), js_api=Api(),
                                   width=1366, height=820, min_size=(1000, 640), maximized=True)
    webview.start(lambda: threading.Thread(target=verificar_atualizacoes, daemon=True).start(),
                  private_mode=False, storage_path=str(PASTA / 'navegador'))


if __name__ == '__main__':
    iniciar()
