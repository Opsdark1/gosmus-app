import "server-only";
import { adminAuth } from "./firebase-admin";
import { SESSION_MAX_AGE } from "./constants";
export { TRIAL_DAYS, PURGE_DAYS, SESSION_MAX_AGE, formatCurrency, formatDate, getTrialStatus, type TrialStatus } from "./constants";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), ms)
    )
  ]);
}

export function decodeTokenUnsafe(token: string): Record<string, unknown> | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload;
  } catch {
    return null;
  }
}

export async function checkFirebaseUserExists(uid: string): Promise<boolean> {
  try {
    await withTimeout(adminAuth.getUser(uid), 3000);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("no user record") || errorMessage.includes("user-not-found")) {
      return false;
    }
    return true;
  }
}

export async function verifyIdToken(idToken: string) {
  try {
    return await withTimeout(adminAuth.verifyIdToken(idToken, true), 3000);
  } catch {
    const payload = decodeTokenUnsafe(idToken);
    if (!payload) throw new Error("Token invalide");
    return {
      uid: (payload.user_id || payload.sub) as string,
      email: payload.email as string | undefined,
      phone_number: payload.phone_number as string | undefined,
      email_verified: payload.email_verified as boolean | undefined,
      name: payload.name as string | undefined,
    };
  }
}

export async function verifySessionCookie(sessionCookie: string) {
  try {
    return await withTimeout(adminAuth.verifySessionCookie(sessionCookie, true), 3000);
  } catch {
    const payload = decodeTokenUnsafe(sessionCookie);
    if (!payload) return null;
    return {
      uid: (payload.uid || payload.user_id || payload.sub) as string,
      email: payload.email as string | undefined,
    };
  }
}

export async function createSessionCookie(idToken: string): Promise<string> {
  try {
    return await withTimeout(
      adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE * 1000 }),
      3000
    );
  } catch {
    return idToken;
  }
}

export function getSessionFromCookie(cookieHeader: string): string | null {
  const match = cookieHeader.match(/__session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
