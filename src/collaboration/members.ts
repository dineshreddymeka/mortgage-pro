import type { HouseMembersMeta, PropertyInviteRecord } from "./types";

export function normalizeInviteEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function hashInviteEmail(raw: string): Promise<string> {
  const normalized = normalizeInviteEmail(raw);
  if (!normalized) throw new Error("Email is required.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function parseMembersMeta(raw: unknown): HouseMembersMeta {
  if (!raw || typeof raw !== "object") return {};
  const out: HouseMembersMeta = {};
  for (const [uid, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!uid.trim() || !value || typeof value !== "object") continue;
    const o = value as Record<string, unknown>;
    if (o.role !== "member") continue;
    const addedAt = typeof o.addedAt === "string" ? o.addedAt : null;
    const addedBy = typeof o.addedBy === "string" ? o.addedBy : null;
    if (!addedAt || !addedBy) continue;
    out[uid] = {
      role: "member",
      addedAt,
      addedBy,
      via: o.via === "email" ? "email" : o.via === "uid" ? "uid" : undefined,
      label: typeof o.label === "string" && o.label.trim() ? o.label.trim().slice(0, 80) : undefined,
    };
  }
  return out;
}

export function isHouseOwner(ownerUid: string, uid: string): boolean {
  return ownerUid === uid;
}

export function isHouseMember(ownerUid: string, memberUids: string[] | undefined, uid: string): boolean {
  return isHouseOwner(ownerUid, uid) || (memberUids ?? []).includes(uid);
}

export function parsePropertyInvite(raw: unknown, id: string): PropertyInviteRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const propertyDocId = typeof o.propertyDocId === "string" ? o.propertyDocId : null;
  const ownerUid = typeof o.ownerUid === "string" ? o.ownerUid : null;
  const houseId = typeof o.houseId === "string" ? o.houseId : null;
  const status =
    o.status === "pending" || o.status === "accepted" || o.status === "revoked" ? o.status : null;
  const createdAt = typeof o.createdAt === "number" && Number.isFinite(o.createdAt) ? o.createdAt : null;
  if (!propertyDocId || !ownerUid || !houseId || !status || createdAt == null) return null;
  return {
    id,
    propertyDocId,
    ownerUid,
    houseId,
    status,
    createdAt,
    targetUid: typeof o.targetUid === "string" ? o.targetUid : undefined,
    emailHash: typeof o.emailHash === "string" ? o.emailHash : undefined,
    expiresAt: typeof o.expiresAt === "number" ? o.expiresAt : undefined,
    acceptedAt: typeof o.acceptedAt === "number" ? o.acceptedAt : undefined,
    acceptedByUid: typeof o.acceptedByUid === "string" ? o.acceptedByUid : undefined,
  };
}

export function inviteMatchesUser(
  invite: PropertyInviteRecord,
  uid: string,
  emailHash: string | null
): boolean {
  if (invite.status !== "pending") return false;
  if (invite.expiresAt != null && invite.expiresAt < Date.now()) return false;
  if (invite.targetUid && invite.targetUid === uid) return true;
  if (invite.emailHash && emailHash && invite.emailHash === emailHash) return true;
  return false;
}
