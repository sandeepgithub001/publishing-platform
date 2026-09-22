import { Injectable } from '@angular/core';
import {
  FieldValue,
  WriteBatch,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { fb } from '../firebase';
import { TagSummary } from '../models/tag.model';
import { normalizeTag } from '../config/categories';

/** tags/{name} maintenance — counters bumped via set(merge)+increment (spec §4.2). */
@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly db = fb().db;

  /** Create-if-missing and bump articleCount. Runs inside `batch` when given. */
  async bumpTags(tags: string[], delta: number, batch?: WriteBatch): Promise<void> {
    for (const raw of tags) {
      const tag = normalizeTag(raw);
      if (!tag) continue;
      const ref = doc(this.db, 'tags', tag);
      if (batch) {
        batch.set(ref, { name: tag, articleCount: increment(delta) as FieldValue }, { merge: true });
      } else {
        await setDoc(ref, { name: tag, articleCount: increment(delta), updatedAt: serverTimestamp() }, { merge: true });
      }
    }
  }

  async getPopularTags(limitN = 12): Promise<TagSummary[]> {
    const snap = await getDocs(query(collection(this.db, 'tags'), orderBy('articleCount', 'desc'), limit(limitN)));
    return snap.docs.map((d) => ({ name: d.id, articleCount: d.data()['articleCount'] ?? 0, updatedAt: d.data()['updatedAt'] ?? null }));
  }
}
