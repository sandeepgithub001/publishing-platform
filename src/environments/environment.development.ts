import { FirebaseOptions } from 'firebase/app';

/**
 * DEV environment (swapped in via fileReplacements in angular.json).
 * useEmulators=true requires `firebase emulators:start` (Auth :9099,
 * Firestore :8080, Storage :9199). Set to false to hit the real project.
 */
export const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDvZINxfEqDjBwEa7kUEboug8826LIR33U",
  authDomain: "eschool-a3042.firebaseapp.com",
  databaseURL: "https://eschool-a3042.firebaseio.com",
  projectId: "eschool-a3042",
  storageBucket: "eschool-a3042.firebasestorage.app",
  messagingSenderId: "809214099071",
  appId: "1:809214099071:web:08202f43d97218775bc94a",
  measurementId: "G-DPQ42M377Y"
};

export const environment = {
  production: false,
  firebaseConfig,
  useEmulators: true,
  emulatorPorts: { auth: 9099, firestore: 8080, storage: 9199 },
  demoCredentials: {
    author: { email: 'author@demo.com', password: 'Author@123!' },
    editor: { email: 'editor@demo.com', password: 'Editor@123!' },
  },
};
