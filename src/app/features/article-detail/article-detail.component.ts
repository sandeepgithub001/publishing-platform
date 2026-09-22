import { Component, inject, Input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import { ArticleService } from '../../core/services/article.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthorService } from '../../core/services/author.service';
import { ToastService } from '../../core/services/toast.service';
import { SafeHtmlPipe } from '../../shared/pipes/safe-html.pipe';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { ReadingTimePipe } from '../../shared/pipes/reading-time.pipe';
import { ArticleCardComponent } from '../../shared/components/article-card.component';
import { CommentThreadComponent } from './comment-thread.component';
import { Article, ArticleCard } from '../../core/models/article.model';

type DetailState = 'loading' | 'ready' | 'not-found' | 'restricted' | 'scheduled';

@Component({
  selector: 'app-article-detail',
  imports: [RouterLink, DatePipe, SafeHtmlPipe, RelativeTimePipe, ReadingTimePipe, ArticleCardComponent, CommentThreadComponent],
  template: `
    @switch (state()) {
      @case ('loading') { <div class="skeleton" style="height: 320px"></div> }
      @case ('not-found') {
        <div class="card empty"><h1>Article not found</h1><p class="muted">It may have been removed, or never existed.</p><a class="btn" routerLink="/home">Back to feed</a></div>
      }
      @case ('restricted') {
        <div class="card empty"><h1>This is a private draft</h1><p class="muted">Only its author and editors can view drafts.</p><a class="btn" routerLink="/home">Back to feed</a></div>
      }
      @case ('scheduled') {
        <div class="card empty">
          <h1>Not published yet</h1>
          <p class="muted">Scheduled for {{ article()?.publishAt?.toDate() | date:'medium' }}. Check back then!</p>
          <a class="btn" routerLink="/home">Back to feed</a>
        </div>
      }
      @case ('ready') {
        <article class="reader">
          @if (article()?.coverImageUrl) {
            <img class="cover" [src]="article()!.coverImageUrl" [alt]="article()!.title" />
          }
          <h1>{{ article()!.title }}</h1>
          <div class="meta">
            <span>{{ article()!.publishAt | relativeTime }}</span> <span class="dot">·</span>
            <span>{{ article()!.readingMinutes | readingTime }}</span> <span class="dot">·</span>
            <span class="mono">{{ article()!.viewCount }} views</span>
            @if (article()!.isFeatured) { <span class="chip">Editor's pick</span> }
          </div>
          @if (article()!.tags.length) {
            <div class="tags">
              @for (t of article()!.tags; track t) {<a class="chip" routerLink="/home" [queryParams]="{ tag: t }">#{{ t }}</a>}
            </div>
          }
          <div class="article-body" [innerHTML]="article()!.contentHtml | safeHtml"></div>
          <aside class="author-card card">
            <img class="avatar" [src]="article()!.authorPhoto || 'https://i.pravatar.cc/72?u=' + article()!.authorId" alt="" referrerpolicy="no-referrer" />
            <div>
              <a [routerLink]="['/authors', article()!.authorId]"><strong>{{ article()!.authorName }}</strong></a>
              <p class="muted">{{ bio() || 'Writing on PubHub.' }}</p>
            </div>
            <div class="engage">
              <button class="btn" (click)="like()" [disabled]="!auth.isSignedIn()" [class.liked]="isLiked()">♥ {{ article()!.likeCount }}</button>
              <button class="btn btn-secondary" (click)="bookmark()" [disabled]="!auth.isSignedIn()">
                {{ bookmarked() ? '★ Saved' : '☆ Save' }}
              </button>
            </div>
          </aside>
          <section>
            <h2 class="section-title">More from this author</h2>
            <div class="grid related">
              @for (a of moreFromAuthor(); track a.id) {<app-article-card [card]="a" />}
            </div>
            <h2 class="section-title">Related reading</h2>
            <div class="grid related">
              @for (a of related(); track a.id) {<app-article-card [card]="a" />}
            </div>
          </section>
          @if (article(); as a) { <app-comment-thread [article]="a" /> }
        </article>
      }
    }
  `,
  styles: `
    .reader { max-width: 760px; margin: 0 auto; display: grid; gap: 1rem; }
    .cover { border-radius: var(--radius); width: 100%; max-height: 380px; object-fit: cover; }
    h1 { font-family: var(--font); font-size: 2rem; line-height: 1.25; margin: 0.5rem 0 0; }
    .meta { display: flex; gap: 0.45rem; align-items: center; color: var(--text-muted); font-size: 0.85rem; flex-wrap: wrap; }
    .dot { opacity: 0.6; }
    .tags { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .author-card { display: flex; gap: 0.9rem; align-items: center; padding: 1rem; margin-top: 1rem; flex-wrap: wrap; }
    .author-card .avatar { width: 48px; height: 48px; border-radius: 50%; }
    .author-card > div { flex: 1; min-width: 180px; }
    .author-card p { margin: 0.1rem 0; font-size: 0.85rem; }
    .engage { display: flex; gap: 0.5rem; }
    .liked { background: var(--danger); }
    .grid.related { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
    .empty { padding: 3rem; text-align: center; display: grid; gap: 0.6rem; justify-items: center; }
  `,
})
export class ArticleDetailComponent {
  private readonly articles = inject(ArticleService);
  readonly auth = inject(AuthService);
  private readonly authorService = inject(AuthorService);
  private readonly toast = inject(ToastService);
  private readonly title = inject(Title);

  @Input({ required: true }) set id(value: string) {
    void this.load(value);
  }

  readonly article = signal<Article | null>(null);
  readonly state = signal<DetailState>('loading');
  readonly bio = signal('');
  readonly related = signal<ArticleCard[]>([]);
  readonly moreFromAuthor = signal<ArticleCard[]>([]);
  readonly bookmarked = signal(false);

  async load(id: string): Promise<void> {
    this.state.set('loading');
    const article = await this.articles.getArticle(id);
    if (!article) {
      this.state.set('not-found');
      return;
    }
    this.article.set(article);
    this.title.setTitle(`${article.title} — PubHub`);

    const isOwner = article.authorId === this.auth.user()?.uid;
    const privileged = isOwner || this.auth.isEditor();

    if (article.status === 'draft' && !privileged) {
      this.state.set('restricted');
      return;
    }
    if (article.status === 'published' && article.publishAt && article.publishAt.toMillis() > Date.now() && !privileged) {
      this.state.set('scheduled');
      return;
    }
    this.state.set('ready');

    void this.articles.bumpView(id);
    const [authorBio, more, related] = await Promise.all([
      this.authorService.getUserProfile(article.authorId).then((p) => p?.bio ?? ''),
      this.articles.getByAuthor(article.authorId, 4),
      this.articles.getRelated(article),
    ]);
    this.bio.set(authorBio);
    this.moreFromAuthor.set(more.filter((a) => a.id !== id).slice(0, 3));
    this.related.set(related);
    const me = this.auth.user()?.uid;
    if (me) this.bookmarked.set(await this.authorService.isBookmarked(me, id));
  }

  isLiked(): boolean {
    const uid = this.auth.user()?.uid;
    return !!uid && (this.article()?.likedBy.includes(uid) ?? false);
  }

  async like(): Promise<void> {
    const uid = this.auth.user()?.uid;
    const article = this.article();
    if (!uid || !article) {
      this.toast.info('Sign in to like articles.');
      return;
    }
    try {
      const wasLiked = article.likedBy.includes(uid);
      await this.articles.toggleLike(article, uid);
      article.likedBy = wasLiked ? article.likedBy.filter((x) => x !== uid) : [...article.likedBy, uid];
      article.likeCount += wasLiked ? -1 : 1;
      this.article.set({ ...article });
    } catch {
      this.toast.error('Like failed');
    }
  }

  async bookmark(): Promise<void> {
    const me = this.auth.currentProfile();
    const article = this.article();
    if (!me || !article) {
      this.toast.info('Sign in to save articles.');
      return;
    }
    try {
      await this.authorService.toggleBookmark(me.uid, article);
      const next = !this.bookmarked();
      this.bookmarked.set(next);
      this.toast.success(next ? 'Saved to your bookmarks' : 'Removed bookmark');
    } catch {
      this.toast.error('Bookmark failed');
    }
  }
}

