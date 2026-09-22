import { FirebaseOptions } from 'firebase/app';

/**
 * PROD environment. Firebase web-app config is public client identity data
 * (access is controlled by Firestore/Storage security rules, not key secrecy),
 * but values are centralized here and the dev file is swapped via
 * fileReplacements (see angular.json "development" configuration).
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
  production: true,
  firebaseConfig,
  useEmulators: false,
  emulatorPorts: { auth: 9099, firestore: 8080, storage: 9199 },
  demoCredentials: {
    author: { email: 'author@demo.com', password: 'Author@123!' },
    editor: { email: 'editor@demo.com', password: 'Editor@123!' },
  },
};
