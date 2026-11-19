/**
 * BlackPay 0.1.0 — contrato de adaptador para parceiros regulados.
 * Este arquivo NÃO conecta a qualquer instituição e proíbe operações reais por padrão.
 * Autorização, KYC/PLD, webhooks, PCI DSS, chaves e assinatura devem ser implementados
 * e auditados ANTES de criar qualquer outro adaptador.
 */
export class NotConfiguredError extends Error {
 constructor(action){super(action+' indisponível: parceiro regulado não configurado ou não habilitado.');this.name='NotConfiguredError'}
}
export const RealMoneySwitch = Object.freeze({enabled:false, mode:'sandbox-only'});
export class FinancialProviderAdapter {
 async verifyIdentity(_customer){throw new NotConfiguredError('KYC/KYB')}
 async createPaymentAccount(_customer){throw new NotConfiguredError('Conta de pagamento')}
 async getAccountBalance(_partnerAccountId){throw new NotConfiguredError('Consulta de saldo')}
 async createPixCharge(_request){throw new NotConfiguredError('Cobrança Pix')}
 async resolvePixKey(_key){throw new NotConfiguredError('Consulta DICT')}
 async transferPix(_order){throw new NotConfiguredError('Transferência Pix')}
 async withdrawToExternalAccount(_order){throw new NotConfiguredError('Retirada')}
 async getTransferStatus(_providerId){throw new NotConfiguredError('Estado da transferência')}
 async refundPix(_e2eId,_amountMinor){throw new NotConfiguredError('Devolução Pix')}
 async startDispute(_operation){throw new NotConfiguredError('MED e disputa')}
 async createMerchant(_organization){throw new NotConfiguredError('Credenciamento')}
 async orderCardTerminal(_merchant){throw new NotConfiguredError('Maquininha')}
 async captureCardPayment(_merchant,_amountMinor){throw new NotConfiguredError('Captura de cartão')}
 async refundCardPayment(_paymentId,_amountMinor){throw new NotConfiguredError('Estorno de cartão')}
 async listSettlementEvents(_from,_to){throw new NotConfiguredError('Conciliação')}
 async verifyWebhook(_rawBody,_headers){throw new NotConfiguredError('Verificação de webhook')}
}
export function requireMoneyMovementEnabled(config){
 if(RealMoneySwitch.enabled!==true||config?.regulatoryApproved!==true||config?.partnerApproved!==true||config?.securityCertified!==true)
  throw new NotConfiguredError('Movimentação de dinheiro real');
}
export function validatePaymentOrder(order){
 if(!order||!Number.isSafeInteger(order.amountMinor)||order.amountMinor<=0||order.amountMinor>100000000000)
  throw new Error('Valor inválido em centavos');
 if(!/^[\w:-]{12,128}$/.test(String(order.idempotencyKey||'')))
  throw new Error('Chave de idempotência obrigatória');
 if(!order.payerAccountId||!order.payeeAccountId)throw new Error('Contas obrigatórias');
 if(order.payerAccountId===order.payeeAccountId)throw new Error('Mesma conta');
 return Object.freeze({...order});
}
