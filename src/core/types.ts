export type PaymentProvider = "MakeByKBank";

export type PaymentSlip = {
  datetime?: Date;
  provider: PaymentProvider;
  payer?: string;
  payerAccount?: string;
  payee?: string;
  payeeAccount?: string;
  reference?: string;
  amount: number;
  fee: number;
  currency?: "THB";
  transactionId?: string;
};

export interface PaymentSlipParser {
  parse(text: string): PaymentSlip;
}
