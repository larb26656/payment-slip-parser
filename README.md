# Payment Slip Parser

A parser for extracting structured data from payment slips. The project focuses on Thai banking slips and provides a flexible parser registry that can be extended for new providers.

## Build in providers

- ✅ Make by KBank — supported and tested
- ⏳ KBank — planned

## Features

- Detects supported providers and parses slip text into strongly typed `PaymentSlip` objects.
- Normalizes fields such as payer/payee names, masked accounts, amounts, fees, and transaction IDs.
- Provides a registry pattern (`createParserRegistry`) so multiple parsers can coexist.
- Enables developers to register custom parsers for new providers with minimal setup.

## Installation

```bash
npm install payment-slip-parser
```

## Usage

### Parse with automatic provider detection

```ts
import {
  createParserRegistry,
  createMakeByKbankParser,
} from "payment-slip-parser";

const registry = createParserRegistry({
  parsers: [createMakeByKbankParser()],
});

const slip = `
PAYMENT COMPLETED
25 Oct 2025 17:33
make
by KBank
TEAM T xxx-X-x5304-x
... (rest of the OCR text)
`;

const result = registry.parse(slip);
if (!result.ok) {
  console.error(result.error.message);
  process.exit(1);
}

console.log(result.value.transactionId);
console.log(result.value.amount);
```

`registry.parse` tries each registered parser in order and returns a `Result`. When `result.ok === true`, `result.value` is a `PaymentSlip<Provider>` containing:

- `provider` – identifier of the parser that claimed the slip.
- `datetime` – `Date` created from the slip timestamp (if present).
- `payer`/`payerAccount` and `payee`/`payeeAccount`.
- `amount`, `fee`, `currency`, `transactionId`, and any provider-specific metadata.

### Parse with a specific provider

```ts
const result = registry.parseWithProvider(slip, "MakeByKBank");
if (!result.ok && result.error.code === "UNKNOWN_PROVIDER") {
  // Handle unsupported provider selection.
}
```

`parseWithProvider` skips auto-detection and ensures the requested parser is used (or returns `UNKNOWN_PROVIDER` if it is not registered).

## Creating a custom parser

Parsers implement the `PaymentSlipParser<ProviderName>` interface defined in `src/core/types.ts`. The easiest way to stay consistent is to use `createParser`:

```ts
import { createParser, type PaymentSlipParser } from "payment-slip-parser";

const PARSER_NAME = "AcmePay" as const;

export function createAcmePayParser(): PaymentSlipParser<typeof PARSER_NAME> {
  return createParser(PARSER_NAME, {
    canParse(text) {
      return text.includes("Acme Pay");
    },
    parse(text) {
      // Produce a PaymentSlip object. Throw if parsing fails.
      return {
        provider: PARSER_NAME,
        datetime: new Date(),
        amount: 0,
        fee: 0,
      };
    },
  });
}
```

1. **`canParse`** should be cheap; it decides whether the parser should handle the slip.
2. **`parse`** must return a complete `PaymentSlip` object and can reuse helpers tailored to your provider.
3. Add the parser to the registry: `createParserRegistry({ parsers: [createMakeByKbankParser(), createAcmePayParser()] })`.

## Project structure

- `src/index.ts` – entry point for the published package.
- `src/core/parser.ts` – parser + registry factories.
- `src/core/provider/<name>/parser.ts` – provider-specific implementation.
- `src/core/types.ts` – shared types (`PaymentSlip`, `PaymentSlipParser`, `Result`, `ParserError`).
- `src/core/**/*.test.ts` – Vitest suites.

## Scripts

- `npm run dev` – watch `src/` with `tsx`.
- `npm run build` – type-check and emit to `dist/`.
- `npm test` – run Vitest (should pass before submitting changes).

## Contributing

1. Install dependencies with `npm install`.
2. Add or update parsers/tests.
3. Run `npm test` and `npm run build`.
4. Commit the changes and open a pull request.

Licensed under ISC.
