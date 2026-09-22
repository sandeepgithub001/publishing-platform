import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleService } from '../../core/services/article.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Article } from '../../core/models/article.model';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

type Tab = 'drafts' | 'scheduled' | 'published';

/** My Posts: drafts / scheduled / published buckets (spec §5.3). */
@Component({
  selector: 'app-my-posts',
  imports: [RouterLink, RelativeTimePipe],
  template: `
    <h1>My Posts</h1>
    <div class="tabs">
      @for (t of tabs; track t.key) {
        <button class="chip" [class.active]="tab() === t.key" (click)="tab.set(t.key)">
          {{ t.label }} <span class="mono">({{ counts()[t.key] }})</span>
        </button>
      }
    </div>

    @if (loading()) {
      @for (i of [1, 2, 3]; track i) {<div class="skeleton" style="height: 72px; margin: 0.6rem 0"></div>}
    } @else if (visible().length === 0) {
      <div class="card empty">
        <p class="muted">Nothing in {{ tab() }} yet.</p>
        <a class="btn" routerLink="/editor">Start writing</a>
      </div>
    } @else {
      @for (a of visible(); track a.id) {
        <div class="card row">
          <div class="info">
            <a [routerLink]="['/articles', a.id]"><strong>{{ a.title || 'Untitled draft' }}</strong></a>
            <div class="muted sub">
              <span>{{ a.category || 'No category' }}</span>
              @if (tab() === 'scheduled') { <span>· goes live {{ a.publishAt | relativeTime }}</span> }
              @if (tab() === 'published') { <span>· {{ a.publishAt | relativeTime }}</span> }
              <span>· updated {{ a.updatedAt | relativeTime }}</span>
            </div>
            @if (tab() === 'published') {
              <div class="stats muted mono">
                <span>{{ a.viewCount }} views</span><span>{{ a.likeCount }} likes</span><span>{{ a.commentCount }} comments</span>
                @if (a.isFeatured) { <span class="chip">Featured</span> }
              </div>
            }
          </div>
          <div class="actions">
            <a class="btn btn-secondary" [routerLink]="['/editor', a.id]">Edit</a>
            @if (tab() !== 'published') {
              <button class="btn" (click)="publishNow(a)" [disabled]="busy()">Publish now</button>
            }
            @if (tab() === 'scheduled') {
              <button class="btn btn-secondary" (click)="unschedule(a)" [disabled]="busy()">Unschedule</button>
            }
            @if (tab() === 'drafts') {
              <button class="btn btn-danger" (click)="remove(a)" [disabled]="busy()">Delete</button>
            }
          </div>
        </div>
      }
    }
  `,
  styles: `
    .tabs { display: flex; gap: 0.4rem; margin: 0.8rem 0 1.2rem; }
    .row { display: flex; gap: 1rem; justify-content: space-between; align-items: center; padding: 0.9rem 1rem; margin-bottom: 0.6rem; flex-wrap: wrap; }
    .sub, .stats { font-size: 0.8rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .stats { gap: 0.9rem; margin-top: 0.3rem; }
    .actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .empty { padding: 3rem; text-align: center; display: grid; gap: 0.8rem; justify-items: center; }
  `,
})
export class MyPostsComponent implements OnInit {
  private readonly articles = inject(ArticleService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'drafts', label: 'Drafts' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'published', label: 'Published' },
  ];
  readonly tab = signal<Tab>('drafts');
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly mine = signal<Article[]>([]);

  readonly buckets = computed(() => {
    const now = Date.now();
    const drafts: Article[] = [];
    const scheduled: Article[] = [];
    const published: Article[] = [];
    for (const a of this.mine()) {
      if (a.status === 'draft') drafts.push(a);
      else if (a.publishAt && a.publishAt.toMillis() > now) scheduled.push(a);
      else published.push(a);
    }
    return { drafts, scheduled, published };
  });

  readonly counts = computed(() => ({
    drafts: this.buckets().drafts.length,
    scheduled: this.buckets().scheduled.length,
    published: this.buckets().published.length,
  }));

  readonly visible = computed(() => {
    const b = this.buckets();
    return this.tab() === 'drafts' ? b.drafts : this.tab() === 'scheduled' ? b.scheduled : b.published;
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid) return;
    this.loading.set(true);
    try {
      this.mine.set(await this.articles.getMyArticles(uid));
    } finally {
      this.loading.set(false);
    }
  }

  async publishNow(a: Article): Promise<void> {
    this.busy.set(true);
    try {
      await this.articles.publish(a.id);
      this.toast.success('Published!');
      await this.load();
      this.tab.set('published');
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      this.busy.set(false);
    }
  }

  async unschedule(a: Article): Promise<void> {
    this.busy.set(true);
    try {
      await this.articles.unpublish(a.id);
      this.toast.info('Moved back to drafts');
      await this.load();
      this.tab.set('drafts');
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Unschedule failed');
    } finally {
      this.busy.set(false);
    }
  }

  async remove(a: Article): Promise<void> {
    if (!confirm(`Delete draft “${a.title || 'Untitled'}”? This cannot be undone.`)) return;
    this.busy.set(true);
    try {
      await this.articles.deleteDraft(a.id);
      this.toast.success('Draft deleted');
      await this.load();
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      this.busy.set(false);
    }
  }
}
