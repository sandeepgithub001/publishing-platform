import { Injectable, signal } from '@angular/core';
import { DocumentSnapshot } from 'firebase/firestore';
import { ArticleCard, HomeFilters, defaultFilters } from '../models/article.model';
import { ArticleService } from '../services/article.service';

/**
 * Signal store for the home feed (spec §5.3): filter changes reset the cursor,
 * loadMore appends; a sequence guard drops stale responses.
 */
@Injectable({ providedIn: 'root' })
export class FeedStore {
  private readonly articleService: ArticleService;

  readonly filters = signal<HomeFilters>({ ...defaultFilters });
  readonly items = signal<ArticleCard[]>([]);
  readonly loading = signal(false);
  readonly hasMore = signal(false);
  readonly empty = signal(false);

  private cursor: DocumentSnapshot | null = null;
  private seq = 0;

  constructor(articleService: ArticleService) {
    this.articleService = articleService;
  }

  async load(reset = true): Promise<void> {
    const run = ++this.seq;
    if (reset) {
      this.cursor = null;
      this.items.set([]);
    }
    this.loading.set(true);
    try {
      const res = await this.articleService.getFeed(this.filters(), reset ? null : this.cursor);
      if (run !== this.seq) return;
      this.cursor = res.cursor;
      this.hasMore.set(res.hasMore);
      this.items.update((prev) => (reset ? res.items : [...prev, ...res.items]));
      this.empty.set(this.items().length === 0);
    } catch (e) {
      if (run === this.seq) console.error('[feed] load failed', e);
    } finally {
      if (run === this.seq) this.loading.set(false);
    }
  }

  setFilters(patch: Partial<HomeFilters>): void {
    this.filters.update((f) => ({ ...f, ...patch }));
    void this.load(true);
  }

  loadMore(): void {
    if (!this.hasMore() || this.loading()) return;
    void this.load(false);
  }
}
