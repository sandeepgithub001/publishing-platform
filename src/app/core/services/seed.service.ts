import { Injectable } from '@angular/core';
import {
  DocumentSnapshot,
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { fb } from '../firebase';
import { normalizeTags } from '../config/categories';
import { articleHtml, coverUrl, seedTagList, SeedArticle, SeedAuthorDef } from './seed-data.types';
import { SEED_AUTHORS_PART1 } from './seed-authors-1';
import { SEED_AUTHORS_PART2, SEED_COMMENTS } from './seed-authors-2';
import { TagService } from './tag.service';

const FEATURED_SLUGS = ['signals-change-how-we-build', 'shipping-side-projects'];

/**
 * Dev/prod seeder (spec §7). Rule-compliant: each seed author signs in and
 * writes their OWN articles/comments (rules bind authorId to auth.uid).
 * Editor role + isFeatured flips require the console-promoted editor —
 * see ensureFeaturedApplied() (returns manual-step instructions).
 */
@Injectable({ providedIn: 'root' })
export class SeedService {
  private readonly handles = fb();
  private readonly auth = this.handles.auth;
  private readonly db = this.handles.db;

  constructor(private readonly tags: TagService) {}

  async run(): Promise<string> {
    const marker = await getDoc(doc(this.db, 'meta', 'seed'));
    if (marker.exists()) return 'Seed data already present — skipped.';

    const byKey = new Map<string, { def: SeedAuthorDef; uid: string }>();
    const articles = new Map<string, { id: string; uid: string }>();
    const rootComments = new Map<string, string>();
    let index = 0;
    let created = 0;

    for (const def of [...SEED_AUTHORS_PART1, ...SEED_AUTHORS_PART2]) {
      const uid = await this.ensureAuthUser(def);
      byKey.set(def.key, { def, uid });
      await this.writeUserProfile(uid, def);
      for (const a of def.articles) {
        const id = await this.writeArticle(uid, a, index++);
        articles.set(a.slug, { id, uid });
        if (!a.draft) created++;
      }
    }

    for (const c of SEED_COMMENTS) {
      const target = articles.get(c.articleSlug);
      const author = byKey.get(c.authorKey);
      if (!target || !author) continue;
      const parentCommentId = c.replyTo ? rootComments.get(c.articleSlug) ?? null : null;
      const ref = doc(collection(this.db, 'comments'));
      const batch = writeBatch(this.db);
      batch.set(ref, {
        articleId: target.id,
        parentCommentId,
        authorId: target.uid,
        authorName: author.def.displayName,
        authorPhoto: `https://i.pravatar.cc/150?u=${c.authorKey}`,
        message: c.message,
        likeCount: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
      });
      batch.update(doc(this.db, 'articles', target.id), { commentCount: increment(1), popularityScore: increment(2) });
      await batch.commit();
      if (!parentCommentId) rootComments.set(c.articleSlug, ref.id);
    }

    await setDoc(doc(this.db, 'meta', 'seed'), { version: 1, at: serverTimestamp(), featuredApplied: false });
    await signOut(this.auth);
    return `Seeded ${created} published articles (+1 draft, +1 scheduled), ${SEED_COMMENTS.length} comments. NEXT: promote editor@demo.com to role='editor' in the Firestore console, then click "Apply editor picks".`;
  }

  /** After the console role promotion: flip isFeatured on the editor's picks. */
  async ensureFeaturedApplied(): Promise<string> {
    const markerSnap = await getDoc(doc(this.db, 'meta', 'seed'));
    if (markerSnap.exists() && markerSnap.data()['featuredApplied'] === true) {
      return 'Editor picks already applied.';
    }
    await signInWithEmailAndPassword(this.auth, 'editor@demo.com', 'Editor@123!');
    const uid = this.auth.currentUser?.uid ?? '';
    const profile = await getDoc(doc(this.db, 'users', uid));
    if (profile.data()?.['role'] !== 'editor') {
      await signOut(this.auth);
      return 'editor@demo.com is not promoted yet. Set users/{uid}.role = "editor" in the Firestore console, then retry.';
    }
    for (const slug of FEATURED_SLUGS) {
      const snap = await this.findBySlug(slug);
      const data = snap?.data();
      if (snap && data && data['isFeatured'] !== true) {
        await setDoc(snap.ref, { isFeatured: true }, { merge: true });
      }
    }
    await setDoc(doc(this.db, 'meta', 'seed'), { featuredApplied: true }, { merge: true });
    await signOut(this.auth);
    return 'Editor picks applied (2 featured articles).';
  }

  private async ensureAuthUser(def: SeedAuthorDef): Promise<string> {
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, def.email, def.password);
      await updateProfile(cred.user, { displayName: def.displayName });
      return cred.user.uid;
    } catch (e) {
      if ((e as { code?: string }).code === 'auth/email-already-in-use') {
        const cred = await signInWithEmailAndPassword(this.auth, def.email, def.password);
        return cred.user.uid;
      }
      throw e;
    }
  }

  private async writeUserProfile(uid: string, def: SeedAuthorDef): Promise<void> {
    // Editor promotion is a manual console step (rules forbid self-promotion).
    const seedRole = def.role === 'editor' ? 'author' : def.role;
    await setDoc(doc(this.db, 'users', uid), {
      displayName: def.displayName,
      email: def.email,
      photoURL: `https://i.pravatar.cc/150?u=${def.key}`,
      bio: def.bio,
      role: seedRole,
      publishedCount: 0,
      followerCount: 0,
      nameLower: def.displayName.trim().toLowerCase(),
      createdAt: serverTimestamp(),
    }, { merge: true });
  }

  private async writeArticle(uid: string, a: SeedArticle, index: number): Promise<string> {
    const html = articleHtml(a.paragraphs);
    const now = Date.now();
    const publishAt = a.draft
      ? null
      : a.scheduledDaysFromNow
        ? Timestamp.fromMillis(now + a.scheduledDaysFromNow * 86_400_000)
        : Timestamp.fromMillis(now - a.daysAgo * 86_400_000);
    const ref = doc(collection(this.db, 'articles'));
    await setDoc(ref, {
      authorId: uid,
      slug: a.slug,
      title: a.title,
      excerpt: '',
      contentHtml: html,
      coverImageUrl: coverUrl(index),
      category: a.category,
      tags: normalizeTags(a.tags),
      status: a.draft ? 'draft' : 'published',
      isFeatured: false,
      publishAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readingMinutes: 1,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      popularityScore: 0,
      likedBy: [],
    });
    if (!a.draft) {
      const batch = writeBatch(this.db);
      await this.tags.bumpTags(seedTagList(a), 1, batch);
      batch.update(doc(this.db, 'users', uid), { publishedCount: increment(1) });
      await batch.commit();
    }
    return ref.id;
  }

  private async findBySlug(slug: string): Promise<DocumentSnapshot | null> {
    const snap = await getDocs(query(collection(this.db, 'articles'), where('slug', '==', slug)));
    return snap.docs[0] ?? null;
  }
}

