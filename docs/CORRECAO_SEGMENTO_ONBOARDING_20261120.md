# BlackFlow 1.27.1 — Auditoria do segmento e reabertura (20/11/2026)

## Causa confirmada
O login carregava o segmento do Supabase em S.config e executava save(), **antes** do carregamento do cache por abrirClinica(). O cache depois substituía S, fazendo o valor definido na nuvem desaparecer temporariamente. render() chamava checarSegmento() e apresentava novamente o modal de ramo. A mensagem do modal informava incorretamente que era possível trocar livremente nas Configurações.

## Segunda falha encontrada
A função anterior bs_segmento_definir escolhia a primeira clínica administrada do usuário, sem id da clínica em uso. A migração 20261120 cria bs_segmento_definir_para(p_clinica,p_segmento) com checagem da associação como administrador e trava após a primeira escolha, incluindo lock de linha. A função legada deixa de escolher automaticamente quando o usuário administra múltiplas clínicas.

## Correções
- O login não grava estado local antes de carregar cache.
- A clínica configurada no banco é fonte oficial do segmento em todos os carregamentos, inclusive quando não há alterações novas no feed seq.
- O modal não abre para clínica com segmento no servidor ou em cadastro já estabelecido; escolha inicial somente confirmada após resposta do Supabase.
- A troca posterior é barrada para usuário comum; apenas login mestre pode efetuar a troca.
- Plano Só agenda permanece independente do segmento; restrições contratuais do servidor não são alteradas por configuração local.
- Offline preserva segmento previamente conhecido sem pedir nova escolha.
- A rotina de sincronização atualiza a preferência quando o mestre muda o segmento no servidor.
- Nenhum paciente, CPF, telefone, endereço, anamnese, agendamento ou recebimento histórico foi reescrito.

## Homologação
Testes de sintaxe de blocos JavaScript e teste estático/funcional da trava. Continua necessário validar a autenticação e a reabertura real no iPhone com a sessão ativa; não é possível reproduzir a sessão privada sem acesso à conta da clínica.
