export type HouseAccessRole = "owner" | "member";

/** Mirror client `resolvePropertyAccess` for server-side authorization checks. */
export function resolvePropertyAccess(
  data: Record<string, unknown>,
  viewerUid: string
): HouseAccessRole | null {
  const ownerUid = String(data.userId ?? "");
  if (ownerUid && ownerUid === viewerUid) return "owner";

  const memberUids = Array.isArray(data.memberUids)
    ? data.memberUids.filter((v): v is string => typeof v === "string")
    : [];
  if (memberUids.includes(viewerUid)) return "member";

  return null;
}
