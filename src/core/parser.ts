import {
  ParserError,
  Result,
  type PaymentSlip,
  type PaymentSlipParser,
} from "./types.js";

export function createParser<Provider extends string>(
  provider: Provider,
  parser: Omit<PaymentSlipParser<Provider>, "getName">
): PaymentSlipParser<Provider> {
  return {
    ...parser,
    getName: () => provider,
  };
}

export function createParserRegistry<
  Parsers extends readonly PaymentSlipParser<any>[]
>(config: { parsers: Parsers }) {
  type ProviderUnion = Parsers[number] extends PaymentSlipParser<infer P>
    ? P
    : never;

  return {
    parse(text: string): Result<PaymentSlip<ProviderUnion>, ParserError> {
      for (const parser of config.parsers) {
        if (parser.canParse(text)) {
          return Result.ok(parser.parse(text));
        }
      }

      return Result.err(
        new ParserError("NO_MATCHING_PARSER", "No matching parser found")
      );
    },
    parseWithProvider<P extends ProviderUnion>(
      text: string,
      provider: P
    ): Result<PaymentSlip<P>, ParserError> {
      const parser = config.parsers.find(
        (p): p is PaymentSlipParser<P> => p.getName() === provider
      );

      if (!parser) {
        return Result.err(
          new ParserError(
            "UNKNOWN_PROVIDER",
            `No parser found for provider: ${provider}`
          )
        );
      }

      return Result.ok(parser.parse(text));
    },
  };
}
