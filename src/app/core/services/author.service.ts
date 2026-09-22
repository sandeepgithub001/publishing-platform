import { Injectable } from '@angular/core';
import {
  DocumentSnapshot,
  QueryConstraint,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  startAt,
  endAt,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { fb } from '../firebase';
import { AppUser } from '../models/user.model';
import { toProfile } from './auth.service';

export interface PagedAuthors {
  items: AppUser[];
  cursor: DocumentSnapshot | null;
  hasMore: boolean;
}

/** Author directory + profiles + follow (spec §4.3). */
@Injectable({ providedIn: 'root' })
export class AuthorService {
  private readonly db = fb().db;

  async getAuthors(search: string | null, pageSize = 12, cursor: DocumentSnapshot | null): Promise<PagedAuthors> {
    const cs: QueryConstraint[] = [where('publishedCount', '>', 0), orderBy('nameLower', 'asc')];
    if (search) {
      const s = search.trim().toLowerCase();
      cs.push(startAt(s));
      cs.push(endAt(s + '\uf8ff'));
    }
    if (cursor) cs.push(startAfter(cursor));
    cs.push(limit(pageSize));
    const snap = await getDocs(query(collection(this.db, 'users'), ...cs));
    const items = snap.docs.map((d) => toProfile(d) as AppUser);
    return { items, cursor: snap.docs.at(-1) ?? null, hasMore: snap.docs.length === pageSize };
  }

  async getUserProfile(uid: string): Promise<AppUser | null> {
    const snap = await getDoc(doc(this.db, 'users', uid));
    return snap.exists() ? toProfile(snap) : null;
  }

  async isFollowing(meUid: string, targetUid: string): Promise<boolean> {
    const snap = await getDoc(doc(this.db, 'users', meUid, 'following', targetUid));
    return snap.exists();
  }

  async follow(me: AppUser, targetUid: string): Promise<void> {
    if (me.uid === targetUid) return;
    const batch = writeBatch(this.db);
    batch.set(doc(this.db, 'users', me.uid, 'following', targetUid), { followedAt: serverTimestamp() });
    batch.update(doc(this.db, 'users', targetUid), { followerCount: increment(1) });
    await batch.commit();
  }

  async unfollow(meUid: string, targetUid: string): Promise<void> {
    const batch = writeBatch(this.db);
    batch.delete(doc(this.db, 'users', meUid, 'following', targetUid));
    batch.update(doc(this.db, 'users', targetUid), { followerCount: increment(-1) });
    await batch.commit();
  }

  async toggleBookmark(meUid: string, card: {
    id: string; title: string; excerpt: string; coverImageUrl: string; authorName: string;
  }): Promise<void> {
    const ref = doc(this.db, 'users', meUid, 'bookmarks', card.id);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { ...card, addedAt: serverTimestamp() });
    }
  }

  async isBookmarked(meUid: string, articleId: string): Promise<boolean> {
    const snap = await getDoc(doc(this.db, 'users', meUid, 'bookmarks', articleId));
    return snap.exists();
  }

  async getBookmarks(meUid: string): Promise<ArticleBookmark[]> {
    const snap = await getDocs(collection(this.db, 'users', meUid, 'bookmarks'));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data['title'] ?? '',
        excerpt: data['excerpt'] ?? '',
        coverImageUrl: data['coverImageUrl'] ?? '',
        authorName: data['authorName'] ?? '',
        addedAt: data['addedAt'] ?? null,
      };
    });
  }
}

export interface ArticleBookmark {
  id: string;
  title: string;
  excerpt: string;
  coverImageUrl: string;
  authorName: string;
  addedAt: Timestamp | null;
}

