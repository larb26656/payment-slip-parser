import { describe, expect, it } from "vitest";
import { createMakeByKbankParser } from "./parser.js";

describe("parse (MakeByKBank)", () => {
  const p = createMakeByKbankParser();

  it("parses merchant payment slip with duplicated transaction ids", () => {
    const slip = `
PAYMENT COMPLETED
25 Oct 2025 17:33
make
by KBank
TEAM T xxx-X-x5304-x
CULO
ร้านโอมากาเสะดัง บาย
เท็ปเป็น
xxX-X-XXXXXX3150-x
Amount
594.00 Baht
Fee
0.00 Baht
Transaction ID: 045298506ck8rmkoLpp2
Merchant ID: KB000001923815
Transaction ID: APIC1761388405668WOR
Scan to verify
`;

    const result = p.parse(slip);

    expect(result.provider).toBe("MakeByKBank");
    expect(result.datetime?.toISOString()).toBe(
      new Date(2025, 9, 25, 17, 33).toISOString()
    );
    expect(result.amount).toBeCloseTo(594);
    expect(result.fee).toBe(0);
    expect(result.payer).toBe("TEAM T");
    expect(result.payerAccount).toBe("xxx-x-x5304-x");
    expect(result.payee).toBe("ร้านโอมากาเสะดัง บาย เท็ปเป็น");
    expect(result.payeeAccount).toBe("xxx-x-xxxxxx3150-x");
    expect(result.transactionId).toBe("APIC1761388405668WOR");
  });

  it("parses promptpay transfer slip", () => {
    const slip = `
TRANSFER
COMPLETED
26 Oct 2025 01:08
make
by KBank
TEAM T
xxX-X-X5304-x
Prompt
Pay-
SOMCHAI
JAIDEE
xXX-XXX-9595
Amount
65.00 Baht
Fee
0.00 Baht
Transaction ID: 045299506clfr4bvqjSI
Scan to verify
`;

    const result = p.parse(slip);

    expect(result.provider).toBe("MakeByKBank");
    expect(result.datetime?.toISOString()).toBe(
      new Date(2025, 9, 26, 1, 8).toISOString()
    );
    expect(result.amount).toBeCloseTo(65);
    expect(result.fee).toBe(0);
    expect(result.payer).toBe("TEAM T");
    expect(result.payerAccount).toBe("xxx-x-x5304-x");
    expect(result.payee).toBe("Prompt Pay- SOMCHAI JAIDEE");
    expect(result.payeeAccount).toBe("xxx-xxx-9595");
    expect(result.transactionId).toBe("045299506clfr4bvqjSI");
  });

  it("parses bill payment slip", () => {
    const slip = `
PAYMENT
COMPLETED
25 Oct 2025 23:00
make by KBank
TEAM T
xxx-x-×5304-х
การไฟฟ้านครหลวง
011829186
Amount
1,688.10 Baht
Fee
0.00 Baht
Transaction ID: 045298506ckri6n6FnKQ
Scan to verify
`;

    const result = p.parse(slip);

    expect(result.provider).toBe("MakeByKBank");
    expect(result.datetime?.toISOString()).toBe(
      new Date(2025, 9, 25, 23, 0).toISOString()
    );
    expect(result.amount).toBeCloseTo(1688.1);
    expect(result.fee).toBe(0);
    expect(result.payer).toBe("TEAM T");
    expect(result.payerAccount).toBe("xxx-x-×5304-х");
    expect(result.payee).toBe("การไฟฟ้านครหลวง");
    expect(result.payeeAccount).toBe("011829186");
    expect(result.transactionId).toBe("045298506ckri6n6FnKQ");
  });

  it("parses slip with merchant metadata below signature block", () => {
    const slip = `
PAYMENT COMPLETED
22 Oct 2025 19:40

TORLARB T
xxx-x-x5304-x

ไรม์ ไดเนอร์-สยามสแควร์
xxx-x-xxxxxx3150-x

Amount
415.00 Baht

Fee
0.00 Baht

Transaction ID: 045295506cbhvoj47b9h
Merchant ID: 451005731478001
Transaction ID: EDC17611367756039575

make
by KBank

QR Code: Scan to verify
`;

    const result = p.parse(slip);

    expect(result.provider).toBe("MakeByKBank");
    expect(result.datetime?.toISOString()).toBe(
      new Date(2025, 9, 22, 19, 40).toISOString()
    );
    expect(result.amount).toBeCloseTo(415);
    expect(result.fee).toBe(0);
    expect(result.payer).toBe("TORLARB T");
    expect(result.payerAccount).toBe("xxx-x-x5304-x");
    expect(result.payee).toBe("ไรม์ ไดเนอร์-สยามสแควร์");
    expect(result.payeeAccount).toBe("xxx-x-xxxxxx3150-x");
    expect(result.transactionId).toBe("EDC17611367756039575");
  });
});
