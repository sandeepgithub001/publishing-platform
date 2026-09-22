import { Timestamp } from 'firebase/firestore';

export type UserRole = 'reader' | 'author' | 'editor';

/** users/{uid} document — spec §2.2. Doc id == Firebase Auth uid. */
export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio: string;
  role: UserRole;
  publishedCount: number;
  followerCount: number;
  nameLower: string;
  createdAt: Timestamp | null;
}

export const emptyAppUser = (uid: string, displayName: string, email: string, photoURL: string): AppUser => ({
  uid,
  displayName,
  email,
  photoURL,
  bio: '',
  role: 'reader',
  publishedCount: 0,
  followerCount: 0,
  nameLower: displayName.trim().toLowerCase(),
  createdAt: null,
});
