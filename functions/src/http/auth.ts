import { getAuth } from "firebase-admin/auth";

export type VerifiedAuth = { uid: string };

export async function verifyBearerToken(
  authorizationHeader: string | string[] | undefined
): Promise<VerifiedAuth | null> {
  const raw = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  if (typeof raw !== "string" || !raw.startsWith("Bearer ")) return null;
  const token = raw.slice("Bearer ".length).trim();
  if (!token) return null;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}
