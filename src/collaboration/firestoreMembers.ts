import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import type { HouseMembersMeta, PropertyInviteRecord } from "./types";
import {
  hashInviteEmail,
  inviteMatchesUser,
  parseMembersMeta,
  parsePropertyInvite,
} from "./members";

export const PROPERTY_INVITES_COLLECTION = "propertyInvites";
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function requireFirebase() {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured");
  return fb;
}

export function readMembersFromDoc(data: Record<string, unknown>): {
  memberUids: string[];
  members: HouseMembersMeta;
} {
  const memberUids = Array.isArray(data.memberUids)
    ? data.memberUids.filter((v): v is string => typeof v === "string")
    : [];
  return { memberUids, members: parseMembersMeta(data.members) };
}

export async function listInvitesForProperty(
  propertyDocId: string,
  ownerUid: string
): Promise<PropertyInviteRecord[]> {
  const fb = requireFirebase();
  const snap = await getDocs(
    query(
      collection(fb.db, PROPERTY_INVITES_COLLECTION),
      where("propertyDocId", "==", propertyDocId),
      where("ownerUid", "==", ownerUid)
    )
  );
  return snap.docs
    .map((d) => parsePropertyInvite(d.data(), d.id))
    .filter((x): x is PropertyInviteRecord => x != null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function listPendingInvitesForUser(
  uid: string,
  email: string | null
): Promise<PropertyInviteRecord[]> {
  const fb = requireFirebase();
  const emailHash = email ? await hashInviteEmail(email) : null;
  const queries = [
    getDocs(
      query(
        collection(fb.db, PROPERTY_INVITES_COLLECTION),
        where("status", "==", "pending"),
        where("targetUid", "==", uid)
      )
    ),
  ];
  if (emailHash) {
    queries.push(
      getDocs(
        query(
          collection(fb.db, PROPERTY_INVITES_COLLECTION),
          where("status", "==", "pending"),
          where("emailHash", "==", emailHash)
        )
      )
    );
  }
  const snaps = await Promise.all(queries);
  const rows = new Map<string, PropertyInviteRecord>();
  for (const snap of snaps) {
    for (const d of snap.docs) {
      const parsed = parsePropertyInvite(d.data(), d.id);
      if (parsed && inviteMatchesUser(parsed, uid, emailHash)) rows.set(parsed.id, parsed);
    }
  }
  return [...rows.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function inviteMemberByUid(
  propertyDocId: string,
  ownerUid: string,
  _houseId: string,
  targetUid: string,
  label?: string
): Promise<void> {
  const fb = requireFirebase();
  const trimmed = targetUid.trim();
  if (!trimmed || trimmed === ownerUid) throw new Error("Enter a collaborator UID different from yours.");
  await updateDoc(doc(fb.db, "properties", propertyDocId), {
    memberUids: arrayUnion(trimmed),
    [`members.${trimmed}`]: {
      role: "member",
      addedAt: new Date().toISOString(),
      addedBy: ownerUid,
      via: "uid",
      label: label?.trim().slice(0, 80) || undefined,
    },
    updatedAt: Date.now(),
  });
}

export async function createEmailInvite(
  propertyDocId: string,
  ownerUid: string,
  houseId: string,
  email: string
): Promise<string> {
  const fb = requireFirebase();
  const emailHash = await hashInviteEmail(email);
  const now = Date.now();
  const ref = await addDoc(collection(fb.db, PROPERTY_INVITES_COLLECTION), {
    propertyDocId,
    ownerUid,
    houseId,
    emailHash,
    status: "pending",
    createdAt: now,
    expiresAt: now + INVITE_TTL_MS,
    createdAtServer: serverTimestamp(),
  });
  return ref.id;
}

export async function revokeInvite(inviteId: string, ownerUid: string): Promise<void> {
  const fb = requireFirebase();
  await updateDoc(doc(fb.db, PROPERTY_INVITES_COLLECTION, inviteId), {
    status: "revoked",
    revokedAt: Date.now(),
    ownerUid,
  });
}

export async function acceptInvite(
  invite: PropertyInviteRecord,
  uid: string,
  email: string | null
): Promise<void> {
  const fb = requireFirebase();
  const emailHash = email ? await hashInviteEmail(email) : null;
  if (!inviteMatchesUser(invite, uid, emailHash)) throw new Error("Invite is not valid for this account.");
  await updateDoc(doc(fb.db, "properties", invite.propertyDocId), {
    memberUids: arrayUnion(uid),
    [`members.${uid}`]: {
      role: "member",
      addedAt: new Date().toISOString(),
      addedBy: invite.ownerUid,
      via: invite.emailHash ? "email" : "uid",
    },
    updatedAt: Date.now(),
  });
  await updateDoc(doc(fb.db, PROPERTY_INVITES_COLLECTION, invite.id), {
    status: "accepted",
    acceptedAt: Date.now(),
    acceptedByUid: uid,
  });
}

export async function removeMember(
  propertyDocId: string,
  ownerUid: string,
  memberUid: string
): Promise<void> {
  const fb = requireFirebase();
  if (memberUid === ownerUid) throw new Error("Cannot remove the owner.");
  await updateDoc(doc(fb.db, "properties", propertyDocId), {
    memberUids: arrayRemove(memberUid),
    [`members.${memberUid}`]: deleteField(),
    updatedAt: Date.now(),
  });
}

export async function acceptAllPendingInvites(uid: string, email: string | null): Promise<number> {
  const pending = await listPendingInvitesForUser(uid, email);
  let accepted = 0;
  for (const invite of pending) {
    try {
      await acceptInvite(invite, uid, email);
      accepted += 1;
    } catch (err) {
      console.warn("[collaboration] accept invite failed", invite.id, err);
    }
  }
  return accepted;
}
