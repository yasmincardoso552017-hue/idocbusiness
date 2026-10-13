import { describe, expect, it } from "vitest";
import { canClaimSignedCopy, canReadTokenSignedCopy } from "./signed-copy-access";

describe("signed contract access", () => {
  const signer = { status: "signed", revoked: false, email: "signer@example.test", claimed_by: null };
  it("allows the signed copy through the signer's secure link without login", () => {
    expect(canReadTokenSignedCopy(signer, "completed")).toBe(true);
  });
  it("denies a revoked link", () => {
    expect(canReadTokenSignedCopy({ ...signer, revoked: true }, "completed")).toBe(false);
  });
  it("denies unsigned signers and cancelled requests", () => {
    expect(canReadTokenSignedCopy({ ...signer, status: "pending" }, "completed")).toBe(false);
    expect(canReadTokenSignedCopy(signer, "voided")).toBe(false);
  });
  it("allows an authenticated signer to claim their own copy", () => {
    expect(canClaimSignedCopy(signer, "account-a", "SIGNER@example.test")).toBe(true);
  });
  it("denies claiming another person's contract", () => {
    expect(canClaimSignedCopy(signer, "account-b", "other@example.test")).toBe(false);
    expect(canClaimSignedCopy({ ...signer, claimed_by: "account-a" }, "account-b", signer.email)).toBe(false);
  });
});