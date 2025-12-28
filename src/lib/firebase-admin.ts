import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

const rawKey = process.env.FIREBASE_PRIVATE_KEY;
const privateKey = rawKey ? rawKey.split("\\n").join("\n") : undefined;
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!privateKey || !projectId || !clientEmail) {
  throw new Error("Firebase Admin credentials missing");
}

let app: App;

if (getApps().length === 0) {
  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
} else {
  app = getApps()[0];
}

const auth = getAuth(app);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error("Firebase operation timeout")), ms)
    ),
  ]);
}

export const adminAuth: Auth & { 
  createUserWithTimeout: typeof auth.createUser;
  getUserByEmailWithTimeout: typeof auth.getUserByEmail;
  deleteUserWithTimeout: typeof auth.deleteUser;
  updateUserWithTimeout: typeof auth.updateUser;
  generatePasswordResetLinkWithTimeout: typeof auth.generatePasswordResetLink;
} = Object.assign(auth, {
  createUserWithTimeout: (props: Parameters<typeof auth.createUser>[0]) => 
    withTimeout(auth.createUser(props), 30000),
  getUserByEmailWithTimeout: (email: string) => 
    withTimeout(auth.getUserByEmail(email), 10000),
  deleteUserWithTimeout: (uid: string) => 
    withTimeout(auth.deleteUser(uid), 10000),
  updateUserWithTimeout: (uid: string, props: Parameters<typeof auth.updateUser>[1]) => 
    withTimeout(auth.updateUser(uid, props), 10000),
  generatePasswordResetLinkWithTimeout: (email: string) => 
    withTimeout(auth.generatePasswordResetLink(email), 15000),
});

export { app as adminApp };
