import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, connectStorageEmulator, getStorage } from 'firebase/storage';
import { environment } from '../../environments/environment';

/**
 * Firebase bootstrap (direct JS SDK — AngularFire v20 does not support the
 * Angular 22 workspace; see execution log "Deviations").
 * Services call `fb()` once; the first call initializes the app and, in dev,
 * connects the emulators before any data call is made.
 */
export interface FirebaseHandles {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

let handles: FirebaseHandles | null = null;

export function fb(): FirebaseHandles {
  if (handles) return handles;

  const app = initializeApp(environment.firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  if (environment.useEmulators && !environment.production) {
    const { auth: a, firestore: f, storage: s } = environment.emulatorPorts;
    connectAuthEmulator(auth, `http://127.0.0.1:${a}`, { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', f);
    connectStorageEmulator(storage, '127.0.0.1', s);
  }

  handles = { app, auth, db, storage };
  return handles;
}
