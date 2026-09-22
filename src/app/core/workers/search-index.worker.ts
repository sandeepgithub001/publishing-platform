/// <reference lib="webworker" />
import { IndexedArticle, SearchHit, SearchIndex, WorkerRequest, WorkerResponse } from './search-index.core';

/**
 * Search worker entry (spec §7): builds/maintains the inverted index off the
 * main thread. All logic lives in the pure, unit-tested SearchIndex core.
 */
export type { IndexedArticle, SearchField, SearchHit } from './search-index.core';

const index = new SearchIndex();

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type === 'index') {
    for (const article of msg.articles) index.upsert(article);
    return;
  }
  if (msg.type === 'clear') {
    index.clear();
    return;
  }
  if (msg.type === 'search') {
    const response: WorkerResponse = {
      type: 'results',
      requestId: msg.requestId,
      hits: index.search(msg.term, msg.field),
    };
    (self as unknown as Worker).postMessage(response);
  }
};
