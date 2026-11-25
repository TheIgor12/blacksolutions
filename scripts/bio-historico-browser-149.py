"""Ensaio local com dados fictícios. BF_CHROMIUM=/caminho/chromium python scripts/bio-historico-browser-149.py"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import threading

from playwright.sync_api import sync_playwright

repo = Path(__file__).resolve().parent.parent
fixture_text = (repo / 'scripts/test-modulos-clinicos-149.cjs').read_text()
av = fixture_text.index('({segment,screen})=>')
bv = fixture_text.index(',{segment,screen});', av)
fixture = fixture_text[av:bv]
chart_id = "30000000-0000-0000-0000-000000000001"


class ServerLog(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=repo, **kwargs)

    def log_message(self, *args):
        pass


with ThreadingHTTPServer(('127.0.0.1', 0), ServerLog) as server, sync_playwright() as pw:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_address[1]}/'
    args = ['--no-sandbox', '--disable-dev-shm-usage']
    browser = pw.chromium.launch(executable_path=os.getenv('BF_CHROMIUM'), args=args)
    try:
        for width in (390, 1440):
            page = browser.new_page(viewport={'width': width, 'height': 910}, service_workers='block')
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.route('**/*', lambda route: route.continue_() if route.request.url.startswith(url) else route.abort())
            page.goto(url)
            page.evaluate(fixture, {'segment': 'biomedicina', 'screen': 'estetmapa'})
            page.locator('#bf-em-paciente').select_option(chart_id)
            page.locator('#bf-em-im').click()
            assert page.locator('#bf-em-figura, #bf-em-regiao, #bf-em-produtos, #bf-em-quantidade').count() == 0
            assert page.locator('#bf-em-produto').get_attribute('list') is None
            page.locator('#bf-em-produto').fill('Produto fictício provisório')
            page.locator('#bf-em-produto').fill('Produto fictício revisado')
            page.locator('#bf-em-lote').fill('LOTE-ENSAIO')
            page.locator('#bf-em-validade').fill('2028-11-24')
            page.get_by_role('button', name='Guardar registro').click()
            assert 'Confirme' in page.locator('#bf-em-aviso').inner_text()
            assert page.evaluate('window.__testRows.bf_estetmapa_registros.length') == 1
            page.get_by_role('checkbox', name='Confirmo que a aplicação já foi realizada.').check()
            page.get_by_role('button', name='Guardar registro').click()
            page.wait_for_function('() => window.__testRows.bf_estetmapa_registros.length===2')
            record = page.evaluate('window.__testRows.bf_estetmapa_registros.at(-1)')
            assert record['tipo_registro'] == 'intramuscular_realizada'
            assert record['produto'] == 'Produto fictício revisado'
            assert record['prontuario_id'] == chart_id
            assert 'regiao' not in record and 'quantidade' not in record
            assert page.evaluate('document.documentElement.scrollWidth') == width
            assert page.locator('#bf-em-produto').evaluate('e => getComputedStyle(e).fontSize') == '16px'
            # Alteração concorrente no vínculo deve impedir que a nota vá para outra ficha.
            page.evaluate("window.__testRows.bf_prontuarios[0]={...window.__testRows.bf_prontuarios[0],paciente_ref:'P2'}")
            page.get_by_role('button', name='Revisar nota de anamnese').click()
            page.wait_for_function("() => document.querySelector('#bf-em-aviso')?.textContent.includes('Não foi possível abrir')")
            assert not page.locator('#modalRoot .modalw').is_visible()
            page.evaluate("window.__testRows.bf_prontuarios[0].paciente_ref='P1'")
            page.get_by_role('button', name='Revisar nota de anamnese').click()
            modal = page.locator('#modalRoot')
            txt = modal.locator('#bf-em-nota-texto')
            assert modal.get_by_text('Nada será salvo na anamnese.', exact=False).is_visible()
            assert 'Produto fictício revisado' in txt.input_value()
            assert modal.locator('#bf-em-nota-salvar').count() == 0
            assert page.evaluate('S.anamneses.length') == 0
            modal.get_by_role('button', name='Fechar', exact=True).click()
            page.evaluate("""() => {
              const anterior=NV.sb.rpc;
              window.__notasRpc=[];
              NV.sb.rpc=async (nome, dados)=>{
                if(nome!=='bf_registrar_nota_intramuscular')return anterior(nome,dados);
                window.__notasRpc.push(dados);
                return window.__notasRpc.length===1?{data:null,error:{message:'Fixture retry'}}:{data:true,error:null};
              };
            }""")
            page.get_by_role('button', name='Preparar nota na evolução').click()
            assert 'Produto fictício revisado' in txt.input_value()
            txt.fill('Evolução fictícia revisada pela profissional.')
            modal.locator('#bf-em-nota-salvar').click()
            assert page.evaluate('window.__notasRpc.length===0')
            modal.locator('#bf-em-nota-confirmar').check()
            modal.locator('#bf-em-nota-salvar').click()
            assert modal.get_by_text('Você pode tentar confirmar novamente', exact=False).is_visible()
            modal.locator('#bf-em-nota-salvar').click()
            page.wait_for_function("() => document.querySelector('#bf-em-aviso')?.textContent.includes('Nota confirmada')")
            calls = page.evaluate('window.__notasRpc')
            assert len(calls) == 2 and calls[0] == calls[1]
            assert calls[0]['p_paciente_ref'] == 'P1' and calls[0]['p_prontuario'] == chart_id
            assert calls[0]['p_registro'] == record['id']
            assert 'revisada pela profissional' in calls[0]['p_texto']
            assert page.evaluate('S.evolucoes.length===0 && S.anamneses.length===0')
            page.get_by_role('button', name='Preparar nota na evolução').click()
            modal.locator('#bf-em-nota-confirmar').check()
            # A revogação da permissão enquanto o rascunho está aberto impede o envio.
            page.evaluate("""() => {
              NV.papel='membro';S.config.acessos={'ensaio@example.test':'recepcao'};
              S.config.perfis=[{id:'recepcao',nome:'Recepção',telas:['pacientes'],extras:{clinico:false}}];
              document.querySelector('#bf-em-nota-salvar').click();
            }""")
            assert not txt.is_visible()
            assert page.evaluate('window.__notasRpc.length===2')
            assert errors == [], errors
            page.close()
        print('Playwright histórico intramuscular: 390/1440, sem sugestões, gravação explícita, rascunhos editáveis e revogação de permissão.')
    finally:
        browser.close()
        server.shutdown()
