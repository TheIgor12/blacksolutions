# Auditoria de integridade BlackFlow — 20/11/2026

## Incidente
Conflito no sincronizador cliente: um cache local divergente podia ultrapassar a versão remota ao executar upsert sem controle de versão. Há risco de sobrescrita de atendimento, recebimento, telefone, CPF, endereço e anamnese ao usar dois dispositivos.

## Evidências (sem dados pessoais)
- HappyFEET: 297 pacientes, 1.608 agendamentos ativos (1.132 atendidos), 719 lançamentos financeiros, 189 anamneses, 545 tratamentos.
- Nenhuma referência órfã de paciente nas coleções operacionais auditadas.
- Cadastros incompletos não foram alterados: 102 sem CPF, 30 sem telefone e 98 sem endereço.
- Há 1 agendamento ainda rotulado Agendado com lançamento vinculado registrando valor pago; pode ser pré-pagamento e exige revisão contextual.

## Proteção do banco
- Snapshot da clínica em blackflow_audit.happyfeet_snapshot_20261120: 6.428 registros, incluindo exclusões lógicas.
- Auditoria posterior em blackflow_audit.registros_eventos, apenas no banco, com versões anterior e posterior e usuário da operação; schema sem acesso para usuários comuns.
- Nenhum valor histórico de recebimento ou atendimento foi alterado automaticamente.

## Correção da versão 1.27.0
- Compara a versão remota antes de qualquer gravação; usa comparação condicional de seq para evitar corrida entre dispositivos.
- Novos registros usam insert em vez de upsert; colisão de identificador é bloqueada.
- Edições divergentes ficam em conflito, preservadas no cache do dispositivo, com aviso visual; não são sobrescritas.
- Exclusão lógica conserva o conteúdo de dados para auditoria.
- Cache guarda a relação de conflitos; não declara sincronizado enquanto houver pendências.

## Limites e homologação
Ainda são necessários testes autenticados em dois aparelhos com usuários da mesma clínica e exame dos casos específicos relatados. A cópia do dia 20 é um retrato do estado atual e não reconstitui automaticamente valores que já tenham sido sobrescritos antes da criação da auditoria. Conferir backups históricos antes de qualquer restauração. Não divulgar CPF ou dados de saúde nos relatórios públicos.
