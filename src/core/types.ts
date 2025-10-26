export type PaymentSlip<Provider extends string> = {
  datetime?: Date;
  provider: Provider;
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

export interface PaymentSlipParser<Provider extends string> {
  canParse(text: string): boolean;
  parse(text: string): PaymentSlip<Provider>;
  getName(): Provider;
}

export type ParserErrorCode = "NO_MATCHING_PARSER" | "UNKNOWN_PROVIDER";

export class ParserError extends Error {
  constructor(public readonly code: ParserErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ParserError";
  }
}

type ResultOk<T> = { ok: true; value: T };
type ResultErr<E extends Error> = { ok: false; error: E };

export type Result<T, E extends Error = Error> = ResultOk<T> | ResultErr<E>;

export const Result = {
  ok<T, E extends Error = never>(value: T): Result<T, E> {
    return { ok: true, value };
  },
  err<T = never, E extends Error = Error>(error: E): Result<T, E> {
    return { ok: false, error };
  },
};
