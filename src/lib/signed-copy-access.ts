export type SignedCopySigner = { status: string; revoked: boolean; claimed_by?: string | null; email?: string };

export function canReadTokenSignedCopy(signer: SignedCopySigner, requestStatus: string) {
  return signer.status === "signed" && !signer.revoked && !["voided", "cancelled", "declined"].includes(requestStatus);
}

export function canClaimSignedCopy(signer: SignedCopySigner, userId: string, email: string) {
  if (signer.status !== "signed" || signer.revoked) return false;
  if (signer.claimed_by) return signer.claimed_by === userId;
  return !!email && signer.email?.trim().toLowerCase() === email.trim().toLowerCase();
}