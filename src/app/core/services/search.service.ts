import { Injectable } from '@angular/core';
import { IndexedArticle, SearchField, SearchHit, WorkerRequest } from '../workers/search-index.core';

/**
 * Main-thread facade for the search worker. Feed pages are pushed here on
 * load; the navbar queries it (debounced upstream). Falls back to empty
 * results when workers are unavailable.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private worker: Worker | null = null;
  private readonly pending = new Map<number, (hits: SearchHit[]) => void>();
  private seq = 0;

  private ensure(): Worker | null {
    if (this.worker) return this.worker;
    if (typeof Worker === 'undefined') return null;
    try {
      const worker = new Worker(new URL('../workers/search-index.worker', import.meta.url));
      worker.onmessage = ({ data }: MessageEvent) => {
        const msg = data as { type: string; requestId: number; hits?: SearchHit[] };
        if (msg.type === 'results' && msg.hits) {
          this.pending.get(msg.requestId)?.(msg.hits);
          this.pending.delete(msg.requestId);
        }
      };
      this.worker = worker;
      return worker;
    } catch (e) {
      console.warn('[search] worker unavailable', e);
      return null;
    }
  }

  index(articles: IndexedArticle[]): void {
    const worker = this.ensure();
    worker?.postMessage({ type: 'index', articles } satisfies WorkerRequest);
  }

  clear(): void {
    this.worker?.postMessage({ type: 'clear' } satisfies WorkerRequest);
  }

  search(term: string, field: SearchField = 'any'): Promise<SearchHit[]> {
    const worker = this.ensure();
    if (!worker) return Promise.resolve([]);
    const requestId = ++this.seq;
    return new Promise((resolve) => {
      this.pending.set(requestId, resolve);
      worker.postMessage({ type: 'search', term, field, requestId } satisfies WorkerRequest);
      setTimeout(() => {
        if (this.pending.has(requestId)) {
          this.pending.delete(requestId);
          resolve([]);
        }
      }, 3000);
    });
  }
}
