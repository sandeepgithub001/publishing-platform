import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleCard } from '../../core/models/article.model';
import { RelativeTimePipe } from '../pipes/relative-time.pipe';
import { ReadingTimePipe } from '../pipes/reading-time.pipe';

@Component({
  selector: 'app-article-card',
  imports: [RouterLink, RelativeTimePipe, ReadingTimePipe],
  template: `
    <a class="card article-card" [routerLink]="['/articles', card().id]">
      <div class="cover" [style.background]="coverFallback()">
        @if (card().coverImageUrl) {
          <img [src]="card().coverImageUrl" [alt]="card().title" loading="lazy" (error)="coverFailed = true" />
        }
        @if (card().isFeatured) {
          <span class="badge">Editor's pick</span>
        }
      </div>
      <div class="body">
        <h3>{{ card().title || 'Untitled' }}</h3>
        <p class="muted excerpt">{{ card().excerpt }}</p>
        <div class="meta">
          <img class="avatar" [src]="card().authorPhoto || 'https://i.pravatar.cc/40?u=' + card().authorId" alt="" />
          <span>{{ card().authorName }}</span>
          <span class="dot">·</span>
          <span>{{ card().publishAt | relativeTime }}</span>
          <span class="dot">·</span>
          <span>{{ card().readingMinutes | readingTime }}</span>
        </div>
        @if (card().tags.length) {
          <div class="tags">
            @for (t of card().tags.slice(0, 3); track t) {
              <span class="chip">#{{ t }}</span>
            }
          </div>
        }
      </div>
    </a>
  `,
  styles: `
    .article-card { display: flex; flex-direction: column; overflow: hidden; color: var(--text); text-decoration: none; height: 100%; }
    .article-card:hover { border-color: var(--accent); text-decoration: none; }
    .cover { position: relative; aspect-ratio: 16 / 9; background: var(--border); }
    .cover img { width: 100%; height: 100%; object-fit: cover; }
    .badge { position: absolute; top: 0.6rem; left: 0.6rem; background: var(--accent); color: #fff; font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.55rem; border-radius: 999px; }
    .body { display: flex; flex-direction: column; gap: 0.45rem; padding: 0.9rem 1rem 1.1rem; flex: 1; }
    h3 { margin: 0; font-size: 1.02rem; line-height: 1.35; }
    .excerpt { margin: 0; font-size: 0.86rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .meta { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: var(--text-muted); margin-top: auto; }
    .avatar { width: 22px; height: 22px; border-radius: 50%; }
    .dot { opacity: 0.6; }
    .tags { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  `,
})
export class ArticleCardComponent {
  readonly card = input.required<ArticleCard>();
  coverFailed = false;

  coverFallback(): string {
    const palette = ['linear-gradient(135deg,#93c5fd,#a5b4fc)', 'linear-gradient(135deg,#fcd34d,#fda4af)', 'linear-gradient(135deg,#6ee7b7,#93c5fd)', 'linear-gradient(135deg,#f9a8d4,#c4b5fd)'];
    const idx = Math.abs(this.hash(this.card().id)) % palette.length;
    return palette[idx];
  }

  private hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h;
  }
}
