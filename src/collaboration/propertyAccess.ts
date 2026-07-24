import { readMembersFromDoc } from "./firestoreMembers";
import { isHouseMember, isHouseOwner } from "./members";
import type { HouseAccessRole } from "./types";

export function resolvePropertyAccess(
  data: Record<string, unknown>,
  viewerUid: string
): HouseAccessRole | null {
  const ownerUid = String(data.userId ?? "");
  const { memberUids } = readMembersFromDoc(data);
  if (isHouseOwner(ownerUid, viewerUid)) return "owner";
  if (isHouseMember(ownerUid, memberUids, viewerUid)) return "member";
  return null;
}
