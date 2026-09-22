import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EditorDraftService } from '../../core/stores/editor-draft.service';
import { ArticleService } from '../../core/services/article.service';
import { ToastService } from '../../core/services/toast.service';
import { SafeHtmlPipe } from '../../shared/pipes/safe-html.pipe';
import { deriveExcerpt, readingMinutes } from '../../core/util/text';

/** 1:1 preview of the composed draft before publishing (spec §5.2, bonus). */
@Component({
  selector: 'app-preview',
  imports: [SafeHtmlPipe],
  template: `
    @if (draft(); as d) {
      <div class="banner">DRAFT PREVIEW — not visible to readers yet</div>
      <div class="bar">
        <button class="btn btn-secondary" (click)="backToEditor()">← Edit details</button>
        <button class="btn" (click)="publish()" [disabled]="publishing()">
          {{ publishing() ? 'Publishing…' : 'Confirm & publish' }}
        </button>
      </div>
      <article class="reader">
        @if (d.coverImageUrl) { <img class="cover" [src]="d.coverImageUrl" [alt]="d.title" /> }
        <h1>{{ d.title }}</h1>
        <div class="meta muted">
          <span>{{ d.category || 'Uncategorised' }}</span> <span>·</span>
          <span>{{ readingMinutes(d.contentHtml) }} min read</span>
        </div>
        @if (d.tags.length) {
          <div class="tags">@for (t of d.tags; track t) {<span class="chip">#{{ t }}</span>}</div>
        }
        <p class="excerpt muted">{{ deriveExcerpt(d.contentHtml) }}</p>
        <div class="article-body" [innerHTML]="d.contentHtml | safeHtml"></div>
      </article>
    } @else {
      <div class="card empty">
        <p class="muted">No draft in progress.</p>
        <button class="btn" (click)="backToEditor()">Go to the editor</button>
      </div>
    }
  `,
  styles: `
    .banner { background: #f59e0b; color: #1f2937; font-weight: 700; text-align: center; padding: 0.45rem; border-radius: 8px; font-size: 0.85rem; letter-spacing: 0.02em; }
    .bar { display: flex; justify-content: space-between; gap: 0.6rem; margin: 0.8rem 0; }
    .reader { max-width: 760px; margin: 0 auto; display: grid; gap: 0.8rem; }
    .cover { border-radius: var(--radius); width: 100%; max-height: 360px; object-fit: cover; }
    h1 { font-family: var(--font); font-size: 2rem; line-height: 1.25; margin: 0.3rem 0 0; }
    .meta, .tags { display: flex; gap: 0.45rem; font-size: 0.85rem; flex-wrap: wrap; }
    .excerpt { font-style: italic; }
    .empty { padding: 3rem; text-align: center; display: grid; gap: 0.8rem; justify-items: center; }
  `,
})
export class PreviewComponent implements OnInit {
  private readonly drafts = inject(EditorDraftService);
  private readonly articles = inject(ArticleService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly draft = this.drafts.current;
  readonly deriveExcerpt = deriveExcerpt;
  readonly readingMinutes = readingMinutes;
  readonly publishing = signal(false);

  ngOnInit(): void {
    if (!this.drafts.current()) {
      this.toast.info('Nothing to preview — open the editor first.');
    }
  }

  backToEditor(): void {
    const d = this.drafts.current();
    void this.router.navigate(d ? ['/editor', d.id] : ['/editor']);
  }

  async publish(): Promise<void> {
    const d = this.drafts.current();
    if (!d) return;
    this.publishing.set(true);
    try {
      await this.articles.publish(d.id);
      this.drafts.set(null);
      this.toast.success('Published!');
      void this.router.navigate(['/articles', d.id]);
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      this.publishing.set(false);
    }
  }
}
