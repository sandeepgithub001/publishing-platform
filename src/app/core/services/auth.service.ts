import { Injectable, computed, signal } from '@angular/core';
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateAuthDisplayName,
} from 'firebase/auth';
import { DocumentSnapshot, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { fb } from '../firebase';
import { AppUser, UserRole, emptyAppUser } from '../models/user.model';

/**
 * Auth + profile service (spec §5.3). Wraps Firebase Auth; auto-provisions
 * users/{uid} on first sign-in; exposes signal-based state for the zoneless app.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly handles = fb();
  private readonly auth = this.handles.auth;
  private readonly db = this.handles.db;

  private readonly authUser = signal<User | null>(null);
  private readonly profile = signal<AppUser | null>(null);

  /** False until the first onAuthStateChanged resolution — guards read on boot. */
  readonly ready = signal(false);
  readonly user = this.authUser.asReadonly();
  readonly currentProfile = this.profile.asReadonly();
  readonly role = computed<UserRole | null>(() => this.profile()?.role ?? null);
  readonly isSignedIn = computed(() => this.authUser() !== null);
  readonly isAuthor = computed(() => this.role() === 'author' || this.role() === 'editor');
  readonly isEditor = computed(() => this.role() === 'editor');

  constructor() {
    onAuthStateChanged(this.auth, (u) => {
      void this.handleAuthChange(u);
    });
  }

  private async handleAuthChange(u: User | null): Promise<void> {
    this.authUser.set(u);
    if (!u) {
      this.profile.set(null);
      this.ready.set(true);
      return;
    }
    try {
      this.profile.set(await this.ensureProfile(u));
    } catch (e) {
      console.error('[auth] profile provisioning failed', e);
    } finally {
      this.ready.set(true);
    }
  }

  private async ensureProfile(u: User): Promise<AppUser> {
    const ref = doc(this.db, 'users', u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const fallbackName = u.displayName ?? u.email?.split('@')[0] ?? 'Reader';
      const base = emptyAppUser(u.uid, fallbackName, u.email ?? '', u.photoURL ?? '');
      await setDoc(ref, { ...base, createdAt: serverTimestamp() });
      const created = await getDoc(ref);
      return toProfile(created) ?? base;
    }
    const existing = toProfile(snap) ?? emptyAppUser(u.uid, fallbackName(u), u.email ?? '', u.photoURL ?? '');
    if (!existing.nameLower && existing.displayName) {
      const nameLower = existing.displayName.trim().toLowerCase();
      await updateDoc(ref, { nameLower });
      return { ...existing, nameLower };
    }
    return existing;
  }

  async signInWithGoogle(): Promise<void> {
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  async signInWithFacebook(): Promise<void> {
    await signInWithPopup(this.auth, new FacebookAuthProvider());
  }

  /** Demo accounts only (spec §7). */
  async signInDemo(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  async updateProfile(patch: { displayName?: string; bio?: string; photoURL?: string }): Promise<void> {
    const current = this.profile();
    const u = this.authUser();
    if (!current) throw new Error('Not signed in');
    const payload: Record<string, unknown> = { ...patch };
    if (patch.displayName !== undefined) payload['nameLower'] = patch.displayName.trim().toLowerCase();
    await updateDoc(doc(this.db, 'users', current.uid), payload);
    if (u && (patch.displayName || patch.photoURL)) {
      await updateAuthDisplayName(u, {
        displayName: patch.displayName ?? u.displayName,
        photoURL: patch.photoURL ?? u.photoURL,
      });
    }
    const snap = await getDoc(doc(this.db, 'users', current.uid));
    this.profile.set(toProfile(snap) ?? current);
  }
}

function fallbackName(u: User): string {
  return u.displayName ?? u.email?.split('@')[0] ?? 'Reader';
}

export function toProfile(snap: DocumentSnapshot): AppUser | null {
  if (!snap.exists()) return null;
  const d = snap.data() as Partial<AppUser>;
  return {
    uid: snap.id,
    displayName: d.displayName ?? 'Reader',
    email: d.email ?? '',
    photoURL: d.photoURL ?? '',
    bio: d.bio ?? '',
    role: (d.role as UserRole) ?? 'reader',
    publishedCount: d.publishedCount ?? 0,
    followerCount: d.followerCount ?? 0,
    nameLower: d.nameLower ?? (d.displayName ?? '').toLowerCase(),
    createdAt: d.createdAt ?? null,
  };
}
