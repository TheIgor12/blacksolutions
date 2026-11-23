/* BlackFlow 1.37.0 — orçamento e receituário com a identidade da clínica.

   O formulário com botão de adicionar item e o serviço ligado ao cadastro já
   existiam. O que faltava era a saída: o documento impresso não tinha a cara
   do material da clínica.

   Agora o orçamento sai no desenho do modelo entregue: logotipo ao centro,
   título em azul escuro, paciente e tratamento lado a lado, tabela de
   serviço, descrição e valor com a faixa azul no cabeçalho e as linhas
   alternadas, e a barra de rodapé com telefone, endereço e Instagram.

   O receituário continua saindo sobre o papel timbrado carregado em
   Configurações, que é o caminho certo para documento de saúde: o timbre
   vem do arquivo da própria clínica, não de uma imitação feita em código.

   As cores foram tiradas do próprio modelo, não escolhidas no olho:
   azul da faixa #3178BA, azul do título #21409A, cinza das linhas #F4F4F4. */
(function () {
  'use strict';
  if (window.__bfDocumentos137) return;
  window.__bfDocumentos137 = true;

  var AZUL = '#3178BA', AZUL_ESCURO = '#21409A', CINZA = '#F4F4F4';

  function E(v) { return esc(v == null ? '' : String(v)); }
  function cfg() { try { return S.config || {}; } catch (e) { return {}; } }
  function clinica() { return cfg().clinica || 'Clínica'; }
  function dinheiro(v) {
    var n = Number(v) || 0;
    return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function tituloDoOrcamento() {
    var s = cfg().segmento;
    var m = {
      podologia: 'ORÇAMENTO DE ATENDIMENTO PODOLÓGICO',
      estetica: 'ORÇAMENTO DE PROCEDIMENTOS ESTÉTICOS',
      beleza: 'ORÇAMENTO DE SERVIÇOS',
      barbearia: 'ORÇAMENTO DE SERVIÇOS',
      odontologia: 'ORÇAMENTO DE TRATAMENTO ODONTOLÓGICO',
      biomedicina: 'ORÇAMENTO DE PROCEDIMENTOS'
    };
    return m[s] || 'ORÇAMENTO DE ATENDIMENTO';
  }
  function instagram() {
    var i = cfg().instagram || '';
    if (!i) return '';
    return i.charAt(0) === '@' ? i : '@' + i.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');
  }
  function telefone() { return cfg().telefone || cfg().celular || ''; }
  function endereco() {
    var c = cfg();
    var p = [c.endereco, c.numero && ('nº ' + c.numero), c.bairro, c.cidade && (c.cidade + (c.uf ? '/' + c.uf : ''))];
    return p.filter(Boolean).join(', ');
  }

  var ESTILO =
    '<style>' +
    '@page{size:A4;margin:0}' +
    'html,body{margin:0;background:#fff;color:#2b3a4a;font-family:"Trebuchet MS",Verdana,Arial,sans-serif}' +
    '*{box-sizing:border-box}' +
    '.folha{width:210mm;min-height:297mm;padding:14mm 16mm 0;position:relative;display:flex;flex-direction:column;page-break-after:always}' +
    '.marca{text-align:center;margin-bottom:6mm}' +
    '.marca img{max-height:30mm;max-width:70mm;object-fit:contain}' +
    '.marca .nome{font-size:20pt;font-weight:800;color:' + AZUL + '}' +
    '.marca .sub{font-size:9pt;color:' + AZUL + ';letter-spacing:.08em}' +
    'h1{font-size:15pt;font-weight:800;color:' + AZUL_ESCURO + ';text-align:center;margin:0 0 7mm;letter-spacing:.01em}' +
    '.campos{display:flex;gap:10mm;margin-bottom:6mm}' +
    '.campos>div{flex:1}' +
    '.campos .rot{font-size:10.5pt;font-weight:800;color:' + AZUL_ESCURO + ';letter-spacing:.04em;margin-bottom:2mm}' +
    '.campos .val{font-size:11pt;color:' + AZUL + ';line-height:1.45}' +
    'table{width:100%;border-collapse:collapse;font-size:9.5pt}' +
    'thead th{background:' + AZUL + ';color:#fff;font-weight:800;letter-spacing:.06em;' +
    'padding:4mm 3mm;text-align:center;font-size:10pt}' +
    'tbody td{padding:4mm 3mm;color:' + AZUL + ';vertical-align:middle;border-bottom:1px solid #fff}' +
    'tbody tr:nth-child(odd) td{background:' + CINZA + '}' +
    'tbody tr:nth-child(even) td{background:#fafafa}' +
    'td.serv{font-size:10pt;text-transform:uppercase;width:33%}' +
    'td.desc{width:40%;text-align:justify}' +
    'td.val{width:27%;text-align:center;font-size:10pt}' +
    '.obs{font-size:9pt;color:' + AZUL + ';margin:4mm 0 0;font-style:italic}' +
    '.total{margin:5mm 0 0;text-align:right;font-size:12pt;font-weight:800;color:' + AZUL_ESCURO + '}' +
    '.espaco{flex:1}' +
    '.rodape{margin:0 -16mm;padding:0 16mm 8mm;border-top:2px solid ' + AZUL + ';padding-top:4mm;' +
    'display:flex;gap:6mm;justify-content:space-between;align-items:flex-start;' +
    'font-size:8.5pt;font-weight:700;color:' + AZUL + ';text-align:center}' +
    '.rodape div{flex:1}' +
    '.aviso{margin:4mm 0 0;padding:3mm;border:1px solid ' + AZUL + ';border-radius:2mm;' +
    'font-size:8.5pt;color:' + AZUL_ESCURO + ';text-align:center}' +
    '.timbre{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;z-index:0}' +
    '.corpo{position:relative;z-index:1}' +
    '</style>';

  function marca() {
    var logo = cfg().logo || '';
    if (logo) return '<div class="marca"><img src="' + E(logo) + '" alt="' + E(clinica()) + '"></div>';
    return '<div class="marca"><div class="nome">' + E(clinica()) + '</div>' +
      (cfg().segmento ? '<div class="sub">' + E(SEGMENTOS[cfg().segmento] ? SEGMENTOS[cfg().segmento].nome : '') + '</div>' : '') + '</div>';
  }
  function rodape() {
    var t = telefone(), en = endereco(), ig = instagram();
    if (!t && !en && !ig) return '';
    return '<div class="rodape">' +
      (t ? '<div>' + E(t) + '</div>' : '') +
      (en ? '<div>' + E(en) + '</div>' : '') +
      (ig ? '<div>' + E(ig) + '</div>' : '') +
      '</div>';
  }

  function linhasOrcamento(d) {
    return (d.items || []).map(function (x) {
      var q = Number(x.quantidade) || 1;
      var unit = Number(x.valor) || 0;
      var valor = q > 1 ? (q + ' sessões / ' + dinheiro(unit * q)) : dinheiro(unit);
      return '<tr><td class="serv">' + E(x.nome) + '</td>' +
        '<td class="desc">' + E(x.descricao || '') + '</td>' +
        '<td class="val">' + E(valor) + '</td></tr>';
    }).join('');
  }

  function abrir(titulo, corpo) {
    var w = window.open('', '_blank');
    if (!w) { toast('Permita pop-ups para imprimir ou salvar em PDF.'); return; }
    w.document.open();
    w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' +
      E(titulo) + '</title>' + ESTILO + '</head><body>' + corpo +
      '<scr' + 'ipt>window.onload=function(){setTimeout(function(){window.print()},600)}</scr' + 'ipt>' +
      '</body></html>');
    w.document.close();
  }

  var imprimirOriginal = window.bfDocPrint;

  window.bfDocPrint = function (kind, id) {
    /* Receituário continua no caminho antigo, que usa o papel timbrado
       carregado pela clínica. Documento de saúde não leva timbre imitado. */
    if (kind === 'receita') return imprimirOriginal.apply(this, arguments);

    var lista = (S.orcamentos || []);
    var d = lista.find(function (x) { return x.id === id; });
    if (!d) return;

    var total = (d.items || []).reduce(function (t, x) {
      return t + (Number(x.valor) || 0) * (Number(x.quantidade) || 1);
    }, 0);

    var corpo = '<div class="folha">' + marca() +
      '<h1>' + E(tituloDoOrcamento()) + '</h1>' +
      '<div class="campos">' +
      '<div><div class="rot">PACIENTE:</div><div class="val">' + E(d.nome || '') + '</div></div>' +
      '<div><div class="rot">TRATAMENTO:</div><div class="val">' + E(d.tratamento || '') + '</div></div>' +
      '</div>' +
      '<table><thead><tr><th>SERVIÇO</th><th>DESCRIÇÃO</th><th>VALOR</th></tr></thead>' +
      '<tbody>' + linhasOrcamento(d) + '</tbody></table>' +
      '<div class="total">Total: ' + E(dinheiro(total)) + '</div>' +
      '<p class="obs">*Valores sujeitos a alterações*' +
      (d.validade ? ' &nbsp;·&nbsp; Validade da proposta: ' + E(d.validade) : '') + '</p>' +
      (d.nota ? '<div class="aviso">' + E(d.nota) + '</div>' : '') +
      '<div class="espaco"></div>' + rodape() + '</div>';

    abrir('Orçamento', corpo);
  };
})();
