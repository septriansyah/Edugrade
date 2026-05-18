import { getApp, getApps, initializeApp } from 'firebase/app';
import type { FirebaseOptions } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, browserPopupRedirectResolver, getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export type UserRole = "teacher" | "student";

type FirebaseAppletConfig = FirebaseOptions & {
  firestoreDatabaseId?: string;
};

const {
  firestoreDatabaseId = '(default)',
  ...firebaseConfig
} = firebaseAppletConfig as FirebaseAppletConfig;

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = (() => {
  try {
    return initializeFirestore(
      app,
      { experimentalForceLongPolling: true },
      firestoreDatabaseId
    );
  } catch (error: any) {
    if (error?.code === 'failed-precondition' || error?.code === 'already-exists') {
      return getFirestore(app, firestoreDatabaseId);
    }
    throw error;
  }
})();

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch (error: any) {
    if (error?.code === 'auth/already-initialized') {
      return getAuth(app);
    }
    throw error;
  }
})();
export const googleProvider = new GoogleAuthProvider();

async function testConnection() {
  try {
    console.log(`Firebase initialized for project ${firebaseConfig.projectId} using Firestore database ${firestoreDatabaseId}.`);
  } catch (error) {
    console.error("Firebase initialization failed", error);
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function signInWithGoogle() {
  try {
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in with Google", error);
    if (error.code === 'auth/internal-error') {
      console.error("Internal Auth Error context:", error.customData);
    }
    throw error;
  }
}

function isUserRole(role: unknown): role is UserRole {
  return role === "teacher" || role === "student";
}

export async function ensureUserProfile(user: User, preferredRole?: UserRole) {
  const userRef = doc(db, 'users', user.uid);
  try {
    const userSnap = await getDoc(userRef);
    const existingRole = userSnap.exists() ? userSnap.data().role : null;

    if (isUserRole(existingRole)) {
      return existingRole;
    }

    if (!preferredRole) {
      return null;
    }

    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || '',
      photoURL: user.photoURL || null,
      role: preferredRole,
      ...(userSnap.exists() ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp() })
    }, { merge: true });

    return preferredRole;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export async function createUserProfile(user: User, role: UserRole) {
  return ensureUserProfile(user, role);
}

export async function logOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
}
