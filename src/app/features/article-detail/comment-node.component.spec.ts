import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';
import { CommentNodeComponent } from './comment-node.component';
import { CommentNode } from '../../core/models/comment.model';

const makeNode = (patch: Partial<CommentNode> = {}): CommentNode => ({
  id: 'c1',
  articleId: 'a1',
  parentCommentId: null,
  authorId: 'u1',
  authorName: 'Marcus Reid',
  authorPhoto: '',
  message: 'The 65-character measure tip alone fixed our mobile bounce rate.',
  likeCount: 2,
  likedBy: [],
  createdAt: Timestamp.fromMillis(Date.now() - 120_000),
  replies: [],
  depth: 0,
  ...patch,
});

describe('CommentNodeComponent (threaded discussion, spec §5.5)', () => {
  let fixture: ComponentFixture<CommentNodeComponent>;

  const setup = (node: CommentNode, currentUid: string | null = null, isEditor = false): void => {
    fixture = TestBed.createComponent(CommentNodeComponent);
    fixture.componentRef.setInput('node', node);
    fixture.componentRef.setInput('currentUid', currentUid);
    fixture.componentRef.setInput('isEditor', isEditor);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CommentNodeComponent] }).compileComponents();
  });

  it('renders author, message and like count', () => {
    setup(makeNode());
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Marcus Reid');
    expect(text).toContain('65-character measure');
    expect(text).toContain('♥ 2');
  });

  it('emits liked with the node when the like button is clicked', () => {
    setup(makeNode());
    let emitted: CommentNode | undefined;
    fixture.componentInstance.liked.subscribe((n) => (emitted = n));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.actions button')!.click();
    expect(emitted?.id).toBe('c1');
  });

  it('opens the reply composer and emits the trimmed message', () => {
    setup(makeNode());
    let payload: { node: CommentNode; message: string } | undefined;
    fixture.componentInstance.replied.subscribe((p) => (payload = p));

    fixture.componentInstance.replying.set(true);
    fixture.componentInstance.replyText = '  Nice write-up!  ';
    fixture.detectChanges();
    fixture.componentInstance.submitReply();

    expect(payload?.message).toBe('Nice write-up!');
    expect(payload?.node.id).toBe('c1');
    expect(fixture.componentInstance.replying()).toBe(false);
  });

  it('hides Reply at the depth cap and does not offer delete to strangers', () => {
    setup(makeNode({ depth: 5 }), 'someone-else');
    const el = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.canReply()).toBe(false);
    expect(el.textContent).not.toContain('Reply');
    expect(fixture.componentInstance.deletable()).toBe(false);
  });

  it('allows the author (and editors) to delete their own comment', () => {
    setup(makeNode(), 'u1');
    expect(fixture.componentInstance.deletable()).toBe(true);

    let removed: CommentNode | undefined;
    fixture.componentInstance.removed.subscribe((n) => (removed = n));
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.actions button'))
      .find((b) => b.textContent?.includes('Delete'))!
      .click();
    expect(removed?.id).toBe('c1');

    setup(makeNode(), 'moderator', true);
    expect(fixture.componentInstance.deletable()).toBe(true);
  });

  it('indents nested replies up to the depth cap', () => {
    setup(makeNode({ depth: 3 }));
    const style = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.node')!.style;
    expect(style.marginLeft).toBe('3.3rem');
  });
});
