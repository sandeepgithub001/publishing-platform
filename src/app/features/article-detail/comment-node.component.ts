import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommentNode } from '../../core/models/comment.model';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

/** One comment node; recursively renders replies (depth-capped upstream). */
@Component({
  selector: 'app-comment-node',
  imports: [FormsModule, RelativeTimePipe],
  template: `
    <article class="node" [style.margin-left.rem]="depthIndent()">
      <img class="avatar" [src]="node().authorPhoto || 'https://i.pravatar.cc/40?u=' + node().authorId" alt="" referrerpolicy="no-referrer" />
      <div class="body">
        <header>
          <strong>{{ node().authorName }}</strong>
          <span class="muted">· {{ node().createdAt | relativeTime }}</span>
        </header>
        <p class="message">{{ node().message }}</p>
        <div class="actions">
          <button class="linklike" (click)="liked.emit(node())">♥ {{ node().likeCount }}</button>
          @if (canReply()) {
            <button class="linklike" (click)="replying.set(!replying())">Reply</button>
          }
          @if (deletable()) {
            <button class="linklike danger" (click)="removed.emit(node())">Delete</button>
          }
        </div>
        @if (replying()) {
          <form class="reply" (ngSubmit)="submitReply()">
            <textarea class="textarea" name="reply" [(ngModel)]="replyText" rows="2" maxlength="2000"
              placeholder="Reply…" required></textarea>
            <div class="row">
              <button class="btn" type="submit" [disabled]="!replyText.trim()">Reply</button>
              <button class="btn btn-ghost" type="button" (click)="replying.set(false)">Cancel</button>
            </div>
          </form>
        }
        @for (r of node().replies; track r.id) {
          <app-comment-node [node]="r" [currentUid]="currentUid()" [isEditor]="isEditor()" [maxDepth]="maxDepth()"
            (liked)="liked.emit($event)" (replied)="replied.emit($event)" (removed)="removed.emit($event)" />
        }
      </div>
    </article>
  `,
  styles: `
    .node { display: flex; gap: 0.6rem; padding: 0.55rem 0; }
    .avatar { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; }
    .body { flex: 1; min-width: 0; }
    header { font-size: 0.85rem; }
    .message { margin: 0.15rem 0 0.35rem; font-size: 0.9rem; white-space: pre-wrap; word-break: break-word; }
    .actions { display: flex; gap: 0.8rem; }
    .linklike { background: none; border: none; padding: 0; color: var(--text-muted); font-size: 0.78rem; cursor: pointer; }
    .linklike:hover { color: var(--accent); }
    .linklike.danger:hover { color: var(--danger); }
    .reply { display: grid; gap: 0.4rem; margin: 0.5rem 0; max-width: 480px; }
    .row { display: flex; gap: 0.5rem; }
  `,
})
export class CommentNodeComponent {
  readonly node = input.required<CommentNode>();
  readonly currentUid = input<string | null>(null);
  readonly isEditor = input(false);
  readonly maxDepth = input(5);

  readonly liked = output<CommentNode>();
  readonly replied = output<{ node: CommentNode; message: string }>();
  readonly removed = output<CommentNode>();

  readonly replying = signal(false);
  replyText = '';

  depthIndent(): number {
    const depth = Math.min(this.node().depth, this.maxDepth());
    return Math.round(depth * 1.1 * 10) / 10; // avoid float noise like 3.3000000000000003
  }

  canReply(): boolean {
    return this.node().depth < this.maxDepth();
  }

  deletable(): boolean {
    const uid = this.currentUid();
    return !!uid && (this.node().authorId === uid || this.isEditor());
  }

  submitReply(): void {
    const message = this.replyText.trim();
    if (!message) return;
    this.replied.emit({ node: this.node(), message });
    this.replyText = '';
    this.replying.set(false);
  }
}
