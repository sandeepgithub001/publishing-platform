import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ArticleService } from '../../core/services/article.service';
import { SearchService } from '../../core/services/search.service';
import { ToastService } from '../../core/services/toast.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { IndexedArticle } from '../../core/workers/search-index.worker';

interface SearchHitView {
  id: string;
  title: string;
  authorName: string;
}

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  template: `
    <header class="nav">
      <div class="container nav-inner">
        <a routerLink="/home" class="brand">Pub<span>Hub</span></a>
        <nav class="links" aria-label="Primary">
          <a routerLink="/home" routerLinkActive="active">Home</a>
          <a routerLink="/discover" routerLinkActive="active">Discover</a>
          <a routerLink="/authors" routerLinkActive="active">Authors</a>
        </nav>
        <div class="search" role="search">
          <input class="input search-input" type="search" placeholder="Search…" aria-label="Search"
            [value]="term()" (input)="onSearch($event)" (blur)="hideSoon()" />
          @if (hits().length > 0) {
            <ul class="search-hits card">
              @for (h of hits(); track h.id) {
                <li><a [routerLink]="['/articles', h.id]" (mousedown)="hits.set([])">
                  <strong>{{ h.title }}</strong><span class="muted"> · {{ h.authorName }}</span>
                </a></li>
              }
            </ul>
          }
        </div>
        <div class="actions">
          @if (auth.isAuthor()) { <a class="btn btn-ghost" routerLink="/editor">Write</a> }
          @if (auth.isSignedIn()) {
            <a routerLink="/profile" [title]="auth.currentProfile()?.displayName">
              <img class="avatar" [src]="photoUrl()" alt="Profile" referrerpolicy="no-referrer" />
            </a>
            <a class="muted" routerLink="/my-posts">My Posts</a>
            <button class="btn btn-secondary" (click)="logout()">Logout</button>
          } @else {
            <a class="btn" routerLink="/login">Sign in</a>
          }
        </div>
      </div>
    </header>
  `,
  styles: `
    .nav { position: sticky; top: 0; z-index: 50; background: var(--surface); border-bottom: 1px solid var(--border); }
    .nav-inner { display: flex; align-items: center; gap: 1rem; height: 60px; }
    .brand { font-weight: 800; font-size: 1.15rem; color: var(--text); }
    .brand span { color: var(--accent); }
    .links { display: flex; gap: 0.9rem; }
    .links a { color: var(--text-muted); font-size: 0.9rem; }
    .links a.active, .links a:hover { color: var(--text); text-decoration: none; }
    .search { position: relative; flex: 1; max-width: 300px; margin-left: auto; }
    .search-input { padding: 0.4rem 0.7rem; font-size: 0.85rem; }
    .search-hits { position: absolute; top: calc(100% + 6px); left: 0; right: 0; max-height: 320px; overflow: auto; padding: 0.35rem; margin: 0; list-style: none; }
    .search-hits a { display: block; padding: 0.45rem 0.5rem; border-radius: 6px; color: var(--text); font-size: 0.85rem; }
    .search-hits a:hover { background: var(--bg); text-decoration: none; }
    .actions { display: flex; align-items: center; gap: 0.6rem; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; }
    @media (max-width: 720px) { .links { display: none; } .actions .muted { display: none; } }
  `,
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  private readonly articles = inject(ArticleService);
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly term = signal('');
  readonly hits = signal<SearchHitView[]>([]);

  private readonly knownDocs = new Map<string, IndexedArticle>();
  private readonly input$ = new Subject<string>();
  private readonly sub = this.input$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((v) => void this.runSearch(v));

  readonly photoUrl = () => this.auth.currentProfile()?.photoURL || 'https://i.pravatar.cc/64?u=pubhub-guest';

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.term.set(value);
    this.input$.next(value);
  }

  hideSoon(): void {
    setTimeout(() => this.hits.set([]), 180);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.toast.info('Signed out');
    void this.router.navigate(['/home']);
  }

  /** Worker-backed search over indexed feed pages (spec §4.3). */
  async runSearch(term: string): Promise<void> {
    if (term.trim().length < 2) {
      this.hits.set([]);
      return;
    }
    if (this.knownDocs.size === 0) {
      await this.warmIndex();
    }
    const found = await this.searchService.search(term, 'any');
    this.hits.set(
      found
        .map((h) => this.knownDocs.get(h.id))
        .filter((d): d is IndexedArticle => !!d)
        .slice(0, 8)
        .map((d) => ({ id: d.id, title: d.title, authorName: d.authorName })),
    );
  }

  private async warmIndex(): Promise<void> {
    // Index the first page(s) so the worker has data on first use; Home keeps
    // pushing pages as they load (T4.1).
    const page = await this.articles.getFeed({ sort: 'popular', category: null, tag: null, pageSize: 60 }, null);
    for (const c of page.items) {
      this.knownDocs.set(c.id, { id: c.id, title: c.title, excerpt: c.excerpt, tags: c.tags, authorName: c.authorName });
    }
    this.searchService.index([...this.knownDocs.values()]);
  }
}
