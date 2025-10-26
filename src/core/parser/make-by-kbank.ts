import type { PaymentSlip, PaymentSlipParser } from "../types.js";

const BRAND_SEPARATOR = "<Brand>";

function normalize(text: string): string {
  let normalizeText = text;

  normalizeText = normalizeText.replaceAll("PAYMENT COMPLETED", "");

  normalizeText = normalizeText.replaceAll("Scan to verify", "");

  // Remove icon market
  normalizeText = normalizeText.replaceAll("CULO", "");

  normalizeText = normalizeText.replaceAll("make\nby KBank", BRAND_SEPARATOR);
  normalizeText = normalizeText.replaceAll("make by KBank", BRAND_SEPARATOR);
  // normalizeText = normalizeText.replace(/make\s*by\s*KBank/gi, BRAND_SEPARATOR);

  return normalizeText;
}

function extractDatetime(input: string): Date | null {
  const re =
    /^\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/;

  const m = re.exec(input);
  if (!m) return null;

  const [, dStr, monStrRaw, yStr, hStr, minStr, sStr] = m;

  const monStr = monStrRaw!.toLowerCase();
  const monthMap: Record<string, number> = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };

  if (!(monStr in monthMap)) return null;

  const day = Number(dStr);
  const month = monthMap[monStr];
  const year = Number(yStr);
  const hour = Number(hStr);
  const minute = Number(minStr);
  const second = sStr ? Number(sStr) : 0;

  if (
    year < 1000 ||
    year > 9999 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  )
    return null;

  const dt = new Date(year, month!, day, hour, minute, second, 0);

  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month ||
    dt.getDate() !== day
  )
    return null;

  return dt;
}

function extractCurrency(text: string): number | undefined {
  const regex = /([\d,]+(?:\.\d+)?)\s*(?:Baht|THB)/i;
  const match = text.match(regex);
  if (!match) return undefined;

  return parseFloat(match[1]!.replace(/,/g, ""));
}

function extractAmount(prevLine: string, text: string): number | undefined {
  if (!prevLine.includes("Amount")) {
    return undefined;
  }

  return extractCurrency(text);
}

function extractFee(prevLine: string, text: string): number | undefined {
  if (!prevLine.includes("Fee")) {
    return undefined;
  }

  return extractCurrency(text);
}

function extractAccount(
  prevLine: string,
  text: string
): { name: string; no: string } | undefined {
  const textParts = text.split(" ");

  // normalize and extract account no
  let name = prevLine;
  let textToProcess = text;

  if (textParts.length > 1) {
    const textName = textParts.slice(0, -1).join(" ");
    const textNo = textParts[textParts.length - 1];

    if (textName) {
      name += " " + textName;
    }

    if (textNo) {
      textToProcess = textNo;
    }
  }

  // normalize name
  name = name.trim();

  let no;

  const firstRule = /^(?=.*[xXхХ])(?=.*\d)[xXхХ×\-\d]+$/;
  if (firstRule.test(textToProcess)) {
    no = textToProcess.toLowerCase();
  }

  const secondRule = /^\d+$/;
  if (secondRule.test(textToProcess)) {
    no = textToProcess;
  }

  if (!no) {
    return undefined;
  }

  return {
    name,
    no,
  };
}

function extractTransactionId(
  prevLine: string,
  text: string
): string | undefined {
  let textToProcess = text;
  let concatLabel;

  const textParts = text.split(" ");

  if (textParts.length > 1) {
    const label = textParts.slice(0, -1).join(" ");
    const textNo = textParts[textParts.length - 1];

    if (label) {
      concatLabel = label;
    }

    if (textNo) {
      textToProcess = textNo;
    }
  }

  if (!concatLabel?.includes("tion ID:") && !prevLine.includes("tion ID:")) {
    return undefined;
  }

  const regex = /^[A-Za-z0-9]+$/;

  if (!regex.test(textToProcess)) return undefined;

  return textToProcess;
}

function parse(text: string): PaymentSlip {
  const normalizeText = normalize(text);
  const payload: PaymentSlip = {
    provider: "MakeByKBank",
    amount: 0,
    fee: 0,
  };

  const rows = normalizeText.split("\n");
  let seenBrand = false;
  let prevLine = "";
  let accountNameStack = [];

  for (const row of rows) {
    const datetime = extractDatetime(row);
    const isAccountDetailSection = seenBrand || payload.datetime;

    if (datetime != null) {
      payload.datetime = datetime;
      continue;
    }

    if (row === BRAND_SEPARATOR) {
      seenBrand = true;
      continue;
    }

    const accountName = accountNameStack.join(" ");

    const account = extractAccount(accountName || prevLine, row);

    if (isAccountDetailSection && account) {
      if (!payload.payerAccount) {
        payload.payer = account.name;
        payload.payerAccount = account.no;

        // reset accountNameStack;
        accountNameStack = [];
        continue;
      } else if (!payload.payeeAccount) {
        payload.payee = account.name;
        payload.payeeAccount = account.no;

        // reset accountNameStack;
        accountNameStack = [];
        continue;
      }
    }

    // seen datetime below should be account
    if (
      isAccountDetailSection &&
      (!payload.payerAccount || !payload.payeeAccount)
    ) {
      accountNameStack.push(row);
    }

    const amount = extractAmount(prevLine, row);

    if (amount !== undefined) {
      payload.amount = amount;
      continue;
    }

    const fee = extractFee(prevLine, row);

    if (fee !== undefined) {
      payload.fee = fee;
      continue;
    }

    const transactionId = extractTransactionId(prevLine, row);

    if (transactionId) {
      payload.transactionId = transactionId;
      continue;
    }

    // if no process save prevLine
    prevLine = row;
  }

  return payload;
}

export function createMakeByKbankParser(): PaymentSlipParser {
  return {
    parse,
  };
}
