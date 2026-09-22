import { Injectable, computed, signal } from '@angular/core';

/** In-progress editor state handed to /editor/preview (spec §5.2). */
export interface EditorDraft {
  id: string;
  title: string;
  category: string;
  tags: string[];
  contentHtml: string;
  coverImageUrl: string;
  savedAt: number;
}

@Injectable({ providedIn: 'root' })
export class EditorDraftService {
  private readonly draft = signal<EditorDraft | null>(null);
  readonly current = this.draft.asReadonly();
  readonly hasDraft = computed(() => this.draft() !== null);

  set(draft: EditorDraft | null): void {
    this.draft.set(draft);
  }
}
