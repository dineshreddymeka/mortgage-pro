import { doc, getDoc } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import { listInvitesForProperty, listPendingInvitesForUser, readMembersFromDoc } from "./firestoreMembers";
import { resolvePropertyAccess } from "./propertyAccess";
import type { HouseCollaborationView } from "./types";

export async function loadHouseCollaborationView(
  propertyDocId: string,
  viewerUid: string
): Promise<HouseCollaborationView> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured");
  const snap = await getDoc(doc(fb.db, "properties", propertyDocId));
  if (!snap.exists()) throw new Error("House not found.");
  const data = snap.data() as Record<string, unknown>;
  const accessRole = resolvePropertyAccess(data, viewerUid);
  if (!accessRole) throw new Error("You do not have access to this house.");
  const ownerUid = String(data.userId ?? "");
  const houseId =
    typeof data.houseId === "string" ? data.houseId : typeof data.id === "string" ? data.id : "001";
  const { memberUids, members } = readMembersFromDoc(data);
  const pendingInvites =
    accessRole === "owner"
      ? (await listInvitesForProperty(propertyDocId, ownerUid)).filter((i) => i.status === "pending")
      : [];
  return { ownerUid, houseId, memberUids, members, accessRole, pendingInvites };
}

export async function loadIncomingInvites(
  viewerUid: string,
  viewerEmail: string | null,
  excludePropertyDocId?: string | null
) {
  const pending = await listPendingInvitesForUser(viewerUid, viewerEmail);
  if (!excludePropertyDocId) return pending;
  return pending.filter((i) => i.propertyDocId !== excludePropertyDocId);
}
