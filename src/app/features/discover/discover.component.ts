import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TagService } from '../../core/services/tag.service';
import { ArticleService } from '../../core/services/article.service';
import { AuthorService } from '../../core/services/author.service';
import { ArticleCardComponent } from '../../shared/components/article-card.component';
import { TagSummary } from '../../core/models/tag.model';
import { ArticleCard } from '../../core/models/article.model';
import { AppUser } from '../../core/models/user.model';

@Component({
  selector: 'app-discover',
  imports: [RouterLink, ArticleCardComponent],
  template: `
    <h1>Discover</h1>

    <section>
      <h2 class="section-title">Popular tags</h2>
      @if (tags().length === 0) {
        <span class="muted">No tags yet — publish something!</span>
      } @else {
        <div class="cloud">
          @for (t of tags(); track t.name) {
            <a class="chip" [routerLink]="[]" [queryParams]="{ tag: t.name }" (click)="browseTag($event, t.name)">#{{ t.name }} <span class="mono muted">{{ t.articleCount }}</span></a>
          }
        </div>
      }
    </section>

    <section>
      <h2 class="section-title">Readers' choice</h2>
      <div class="grid">
        @for (a of trending(); track a.id) {
          <app-article-card [card]="a" />
        }
      </div>
    </section>

    <section>
      <h2 class="section-title">Rising authors</h2>
      <div class="authors">
        @for (u of authors(); track u.uid) {
          <a class="card author" [routerLink]="['/authors', u.uid]">
            <img class="avatar" [src]="u.photoURL || 'https://i.pravatar.cc/72?u=' + u.uid" alt="" referrerpolicy="no-referrer" />
            <div>
              <strong>{{ u.displayName }}</strong>
              <p class="muted">{{ u.bio?.slice(0, 110) }}</p>
              <span class="chip mono">{{ u.publishedCount }} article(s)</span>
            </div>
          </a>
        }
      </div>
    </section>
  `,
  styles: `
    .cloud { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .authors { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
    .author { display: flex; gap: 0.8rem; padding: 0.9rem; color: var(--text); text-decoration: none; }
    .author:hover { border-color: var(--accent); text-decoration: none; }
    .author p { margin: 0.2rem 0 0.5rem; font-size: 0.82rem; }
    .avatar { width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0; }
  `,
})
export class DiscoverComponent implements OnInit {
  private readonly tagService = inject(TagService);
  private readonly articles = inject(ArticleService);
  private readonly authorService = inject(AuthorService);
  private readonly router = inject(Router);

  readonly tags = signal<TagSummary[]>([]);
  readonly trending = signal<ArticleCard[]>([]);
  readonly authors = signal<AppUser[]>([]);

  ngOnInit(): void {
    void this.tagService.getPopularTags(14).then((t) => this.tags.set(t));
    void this.articles
      .getFeed({ sort: 'popular', category: null, tag: null, pageSize: 6 }, null)
      .then((r) => this.trending.set(r.items));
    void this.authorService.getAuthors(null, 6, null).then((r) => this.authors.set(r.items));
  }

  browseTag(event: Event, tag: string): void {
    event.preventDefault();
    void this.router.navigate(['/home'], { queryParams: { tag } });
  }
}
