import { describe, expect, it } from "vitest";
import { createParser, createParserRegistry } from "./parser.js";
import {
  ParserError,
  type PaymentSlip,
  type PaymentSlipParser,
} from "./types.js";

describe("createParser", () => {
  it("wraps parser implementation with provider metadata", () => {
    const parser = createParser("Alpha", {
      canParse: (text) => text.includes("alpha"),
      parse: (text) => ({
        provider: "Alpha",
        amount: text.length,
        fee: 1,
      }),
    });

    expect(parser.getName()).toBe("Alpha");
    expect(parser.canParse("alpha slip")).toBe(true);
    expect(parser.canParse("beta slip")).toBe(false);

    const result = parser.parse("alpha slip");
    expect(result.provider).toBe("Alpha");
    expect(result.amount).toBe("alpha slip".length);
    expect(result.fee).toBe(1);
  });
});

describe("createParserRegistry", () => {
  it("delegates to the first parser that can parse the slip", () => {
    const registry = createParserRegistry({
      parsers: [
        createStubParser({
          provider: "First",
          canParse: () => true,
          payload: { transactionId: "FIRST" },
        }),
        createStubParser({
          provider: "Second",
          canParse: () => true,
          payload: { transactionId: "SECOND" },
        }),
      ],
    });

    const result = registry.parse("any input");
    expect(result.ok).toBe(true);
    if (!result.ok) throw result.error;
    expect(result.value.provider).toBe("First");
    expect(result.value.transactionId).toBe("FIRST");
  });

  it("falls back to later parsers when earlier ones cannot parse the slip", () => {
    let firstVisited = false;
    const registry = createParserRegistry({
      parsers: [
        createStubParser({
          provider: "First",
          canParse: () => {
            firstVisited = true;
            return false;
          },
        }),
        createStubParser({
          provider: "Second",
          canParse: (text) => text.includes("fallback"),
        }),
      ],
    });

    const result = registry.parse("please fallback");

    expect(firstVisited).toBe(true);
    expect(result.ok).toBe(true);
    if (!result.ok) throw result.error;
    expect(result.value.provider).toBe("Second");
  });

  it("parses using a specific provider when requested", () => {
    const registry = createParserRegistry({
      parsers: [
        createStubParser({ provider: "First" }),
        createStubParser({
          provider: "Second",
          payload: { transactionId: "SECOND" },
        }),
      ],
    });

    const result = registry.parseWithProvider("text", "Second");

    expect(result.ok).toBe(true);
    if (!result.ok) throw result.error;
    expect(result.value.provider).toBe("Second");
    expect(result.value.transactionId).toBe("SECOND");
  });

  it("returns an error when parseWithProvider receives an unknown provider", () => {
    const registry = createParserRegistry({
      parsers: [createStubParser({ provider: "Known" })],
    });

    const result = registry.parseWithProvider("text", "Unknown" as any);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error result");
    expect(result.error).toBeInstanceOf(ParserError);
    expect(result.error.code).toBe("UNKNOWN_PROVIDER");
  });

  it("returns an error when no parser claims the slip", () => {
    const registry = createParserRegistry({
      parsers: [createStubParser({ provider: "Never", canParse: () => false })],
    });

    const result = registry.parse("no match");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error result");
    expect(result.error.code).toBe("NO_MATCHING_PARSER");
  });
});

function createStubParser<Provider extends string>({
  provider,
  canParse = () => true,
  payload,
}: {
  provider: Provider;
  canParse?: (text: string) => boolean;
  payload?: Partial<PaymentSlip<Provider>>;
}): PaymentSlipParser<Provider> {
  return createParser(provider, {
    canParse,
    parse: () => ({
      provider,
      amount: 0,
      fee: 0,
      ...payload,
    }),
  });
}
