# BlackFlow | Segurança antes da publicação
Escopo local de revisão; não executar em produção sem a auditoria da coordenação.

## Sincronização, recuperação e decisão da direção
A única fonte remota continua sendo o Supabase. O código existente contém persistência de estado e uma fila de rede no navegador, mas isso não cria uma segunda fonte remota nem um backup recuperável. A sincronização no botão envia e busca registros da operação corrente; um registro de Storage não equivale a uma cópia de seu arquivo. Não mudar o botão, não reintroduzir a cópia no computador, não acionar exportações nem provisionar recurso fora do Supabase. A captura do painel mostra “No backups”. A ausência de ponto restaurável comprovado deve constar na auditoria e não equivale a proteção existente.

## Segundo fator da conta master
Não ativado. O projeto compartilha autenticação com outros produtos. A função de identificação do mestre também é consumida por outros componentes; substituir sua lógica indiscriminadamente pode causar bloqueio geral. Antes da ativação: (1) identificar o painel exato, as funções privilegiadas e a conta autorizada, sem registrar credenciais; (2) o titular inscreve seu autenticador e configura recuperação fora do mesmo aparelho; (3) a coordenação revisa quais funções do BlackFlow devem recusar sessão sem o segundo fator confirmado pelo servidor; a interface sozinha não é o controle; (4) validar entrada com fator, recusa sem fator e recuperação pela conta autorizada, sem revelar código, segredo ou credencial. Não afirmar que houve ativação com teste fictício.

## Registros de abertura
A migração candidata cria uma trilha sem conteúdo clínico, com escrita pela função autenticada após conferir usuário, clínica, prontuário e segmento, e leitura por administrador clínico da mesma clínica. O código vincula os acessos às rotas bfclinico, odontomapa e estetmapa. Não se trata de trilha universal para qualquer acesso direto a dados ou para as outras rotas clínicas legadas; essa cobertura precisa de auditoria separada. Aplicar em homologação antes de carregar o módulo; sem o serviço de registro a abertura nas rotas cobertas falha de forma fechada. Há ensaio com dados fictícios em PostgreSQL embarcado: separação por clínica e perfil, tela incompatível, recusa sem vínculo, exclusão e usuário anônimo. Não há migração aplicada ao Supabase do usuário.

## Auditoria da candidata
Verificar versão em GitHub, ausência de alteração na sincronização e nas regras anteriores, permissões em base de homologação, permissões do navegador em aparelho e consultas com dois perfis, e executar a varredura interativa em 390 e 1440 pixels. Não publicar antes de aprovação. A comparação de hashes e o teste local não equivalem a restauração dentro do Supabase.
