# Online Publishing Platform — Task Breakdown & Progress Tracker

**Source documents**
- Requirements: `Online Publishing Platform - Specification.md` — features, deliverables, evaluation criteria
- Contract: `Online_Publishing_Platform_Technical_Specification.md` — data model, security rules, architecture
- Plan: `Online_Publishing_Platform_Implementation_Plan.md` — phases & sequencing (each task cites its plan section)

**How to use this file**
1. Work tasks in the **Suggested Execution Order** (below); the `Depends on` fields are hard blockers.
2. Update each task's **Status** and tick the `- [ ]` checklists as you complete them.
3. A phase is complete when every task in it is `✅ Done` **and** its exit criteria in the Milestone Map are met.

**Legend**
- Priority: **P0** = must-have (blocks submission) · **P1** = should-have · **P2** = backlog/nice-to-have
- Estimate: rough solo-developer hours (ranges). Total ≈ 45–65 h.
- Status values: `☐ Not started` → `🔶 In progress` → `✅ Done` / `⏸ Blocked (note why)`

---

## Milestone Map

| Phase | Milestone (exit criteria) | Tasks |
| :--- | :--- | :--- |
| **1 — Scaffolding & Firebase** | `ng serve` green; emulators usable; rules + indexes deployed; app boots with Firebase config | T1.1–T1.3 |
| **2 — Data & auth layer** | Google/Facebook/demo sign-in works; `users/{uid}` auto-provisioned; seed data idempotent | T2.1–T2.4 |
| **3 — Shell & auth UI** | Lazy routes + titles; guards block editor routes; login with `returnUrl`; profile editable | T3.1–T3.3 |
| **4 — Reader experience** | Feed with featured/sorts/worker-search/pagination; discover; authors; detail with related + access states | T4.1–T4.5 |
| **5 — Authoring experience** | Draft autosave; media uploads; publish/schedule/unschedule; preview 1:1; My Posts tabs | T5.1–T5.3 |
| **6 — Comments & engagement** | Threaded comments with sorts/likes; delete cleanup; bonus likes/bookmarks/follow | T6.1–T6.2 |
| **7 — Tests, polish & deploy** | `ng test` green (≥ 1 component + ≥ 1 service); responsive/a11y pass; public URL; README complete | T7.1–T7.3 |

---

## Task Index

| ID | Task | Phase | Pri | Est. | Depends on | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| T1.1 | Repository & Angular workspace scaffolding | 1 | P0 | 1–2 h | — | ☐ |
| T1.2 | Firebase project & auth providers setup | 1 | P0 | 1–2 h | T1.1 | ☐ |
| T1.3 | Firestore/Storage security rules & composite indexes | 1 | P0 | 1–2 h | T1.2 | ☐ |
| T2.1 | Domain models & category config | 2 | P0 | 1–2 h | T1.1 | ☐ |
| T2.2 | AngularFire providers & environments | 2 | P0 | 1 h | T1.2, T2.1 | ☐ |
| T2.3 | AuthService, profile provisioning & role signals | 2 | P0 | 2–3 h | T2.2 | ☐ |
| T2.4 | Seed service & demo accounts | 2 | P0 | 1–2 h | T2.3 | ☐ |
| T3.1 | Lazy routing, titles & guards (auth, owner) | 3 | P0 | 1–2 h | T2.3 | ☐ |
| T3.2 | App shell: navbar, footer, toasts, confirm dialog | 3 | P0 | 2 h | T3.1 | ☐ |
| T3.3 | Login UI (Google/Facebook) & profile page | 3 | P0 | 2–3 h | T3.2, T2.3 | ☐ |
| T4.1 | Home feed: featured strip, sorts, cards, pagination | 4 | P0 | 3–4 h | T3.2 | ☐ |
| T4.2 | Global search + search-index web worker | 4 | P0 | 3 h | T4.1 | ☐ |
| T4.3 | Discover page (tags cloud, readers' choice, rising authors) | 4 | P1 | 2–3 h | T4.1 | ☐ |
| T4.4 | Author directory & profile pages | 4 | P0 | 2 h | T4.1 | ☐ |
| T4.5 | Article detail page (render, related, views, access states) | 4 | P0 | 3–4 h | T3.1, T2.3 | ☐ |
| T5.1 | Editor form, Quill rich text & media manager | 5 | P0 | 4–5 h | T3.1, T3.3 | ☐ |
| T5.2 | Publish / schedule / unschedule + counter batches | 5 | P0 | 2 h | T5.1 | ☐ |
| T5.3 | Preview step & My Posts dashboard | 5 | P0 | 2–3 h | T5.2, T4.5 | ☐ |
| T6.1 | Comment thread: tree, sorts, likes, delete cleanup | 6 | P0 | 3–4 h | T4.5 | ☐ |
| T6.2 | Engagement bonus: article likes, bookmarks, follow | 6 | P1 | 2–3 h | T4.5 | ☐ |
| T7.1 | Unit tests (ArticleService + CreateEditArticleComponent) | 7 | P0 | 3–4 h | T5.1, T6.1 | ☐ |
| T7.2 | UX & accessibility polish pass | 7 | P1 | 3 h | T4.1–T6.2 | ☐ |
| T7.3 | Deploy to Firebase Hosting, README & checklist | 7 | P0 | 2 h | T7.1, T7.2 | ☐ |

---

## Suggested Execution Order (critical path)

```
T1.1 → T1.2 → T1.3
  │
  └→ T2.1 → T2.2 → T2.3 → T2.4
                     │ (data contract frozen after T2.3)
                     ▼
T3.1 → T3.2 → T3.3
        │        \
        │         ├→ T4.1 → T4.2 → T4.3
        │         ├→ T4.4
        │         └→ T4.5
        │
        └→ T5.1 → T5.2 → T5.3
T6.1 / T6.2 (start after T4.5) → T7.1 / T7.2 → T7.3
```

> **Parallelism tip:** after **T2.3** the data contract is stable — the reader track (T4.x) and the authoring track (T5.x) can proceed in parallel; T4.3/T4.4 are independent of the feed track once T4.1 lands.

---

## Phase 1 — Scaffolding & Firebase Setup

### T1.1 — Repository & Angular Workspace Scaffolding
**Plan ref:** §1.1 · **Priority:** P0 · **Estimate:** 1–2 h · **Depends on:** — · **Status:** ☐

**Goal:** A clean, buildable repo with the Angular workspace and styling foundation.

**Steps**
- [ ] Create repo with `/frontend` + `/infra` folders; root `.gitignore` (`node_modules/`, `dist/`, `.angular/`, `.firebase/`, key-bearing env files, debug logs)
- [ ] `ng new pubhub-client --routing --style=scss --standalone` (latest stable Angular CLI) in `/frontend`
- [ ] Create `core/`, `features/`, `shared/` skeleton per spec §5.1
- [ ] Global SCSS tokens (colors/spacing/typography) + dark-theme variables; utility layer
- [ ] Initial commit; verify `ng build` + `ng serve`

**Acceptance criteria**
- [ ] Build green; placeholder app renders
- [ ] `git status` shows no artifacts or secrets tracked

### T1.2 — Firebase Project & Auth Providers Setup
**Plan ref:** §1.2 · **Priority:** P0 · **Estimate:** 1–2 h · **Depends on:** T1.1 · **Status:** ☐

**Steps**
- [ ] Create Firebase project (Spark free tier); register the web app
- [ ] Enable Google + Facebook providers (Meta app id/secret); Email/Password enabled for demo accounts only
- [ ] Create Cloud Firestore (production mode) + Storage bucket
- [ ] `npm i firebase @angular/fire ngx-quill quill dompurify`; dev/prod environments with config + `useEmulators` flag
- [ ] Verify emulator suite (Auth/Firestore/Storage) boots and the app connects

**Acceptance criteria**
- [ ] App initializes AngularFire with no console errors (emulator mode)
- [ ] No real keys committed (environment template only)

### T1.3 — Security Rules & Composite Indexes
**Plan ref:** §1.3 · **Priority:** P0 · **Estimate:** 1–2 h · **Depends on:** T1.2 · **Status:** ☐

**Steps**
- [ ] `/infra/firestore.rules` — spec §3.2 verbatim (users, articles, comments, tags, bookmarks, following)
- [ ] `/infra/storage.rules` — spec §4.6 (articles media + avatars, size/type caps)
- [ ] `firestore.indexes.json` — all composite indexes from spec §2.3
- [ ] Deploy: `firebase deploy --only firestore:rules,firestore:indexes,storage` (emulator first)

**Acceptance criteria**
- [ ] Drafts hidden from anonymous reads; scheduled posts hidden until `publishAt <= request.time`
- [ ] Non-owner writes rejected; comment length caps enforced

---

## Phase 2 — Data Layer, Auth & Core Services

### T2.1 — Domain Models & Category Config
**Plan ref:** §2.1 · **Priority:** P0 · **Estimate:** 1–2 h · **Depends on:** T1.1 · **Status:** ☐

**Steps**
- [ ] `core/models/user.model.ts` — `AppUser` (uid, displayName, email, photoURL, bio ≤ 500, role, publishedCount, followerCount, nameLower, createdAt)
- [ ] `core/models/article.model.ts` — `Article` (title 10–200, excerpt ≤ 300, contentHtml, coverImageUrl, category, tags ≤ 5, status, isFeatured, publishAt, counters, popularityScore, likedBy, authorNameLower), `ArticleCard`, `PagedArticles`
- [ ] `core/models/comment.model.ts` — `CommentNode` (parentCommentId, message ≤ 2000, likeCount, likedBy, author snapshot), `CommentSort`
- [ ] `core/models/tag.model.ts` — `TagSummary`; `core/config/categories.ts` — fixed catalog + tag normalization helpers
- [ ] Shared DTOs for editor form ↔ article mapping

**Acceptance criteria**
- [ ] Models compile with strict TS; no `any`
- [ ] Shape matches spec §2.2 field tables exactly

### T2.2 — AngularFire Providers & Environments
**Plan ref:** §2.2 · **Priority:** P0 · **Estimate:** 1 h · **Depends on:** T1.2, T2.1 · **Status:** ☐

**Steps**
- [ ] `app.config.ts`: `provideFirebaseApp` / `provideAuth` / `provideFirestore` / `provideStorage`
- [ ] Emulator connect when `useEmulators` flag is set (dev only)
- [ ] Sanity write/read from a throwaway component (removed after verification)

**Acceptance criteria**
- [ ] SDK initializes in emulator and prod modes with no errors

### T2.3 — AuthService, Profile Provisioning & Role Signals
**Plan ref:** §2.3 · **Priority:** P0 · **Estimate:** 2–3 h · **Depends on:** T2.2 · **Status:** ☐

**Steps**
- [ ] `signInWithPopup(GoogleAuthProvider | FacebookAuthProvider)`, logout, session persistence (default)
- [ ] Auto-provision `users/{uid}` on first sign-in: role `reader`, `nameLower`, counters 0, `serverTimestamp()`
- [ ] Profile read/update (displayName, bio, avatar URL); `nameLower` kept in sync
- [ ] Expose `user`, `profile`, `role` signals (auth.store); email/password path only for demo accounts

**Acceptance criteria**
- [ ] First Google login creates a correct user doc; subsequent logins reuse it
- [ ] Role flows into navbar/guards reactively

### T2.4 — Seed Service & Demo Accounts
**Plan ref:** §2.4 · **Priority:** P0 · **Estimate:** 1–2 h · **Depends on:** T2.3 · **Status:** ☐

**Steps**
- [ ] Dev-only seeder behind a confirmed dialog; idempotent via a `seeded` marker doc
- [ ] Demo accounts: `author@demo.com` / `Author@123!` (author), `editor@demo.com` / `Editor@123!` (editor)
- [ ] ≥ 10 published articles across categories (2 featured, mixed tags, stock images), 1 scheduled (`now + 2 days`), 1 draft, threaded comments, correct tag counters + `publishedCount`

**Acceptance criteria**
- [ ] Re-running the seeder duplicates nothing
- [ ] Featured + scheduled + draft articles exist (needed by T4.1/T5.3)

---

## Phase 3 — App Shell, Routing & Authentication UI

### T3.1 — Lazy Routing, Titles & Guards
**Plan ref:** §3.1 · **Priority:** P0 · **Estimate:** 1–2 h · **Depends on:** T2.3 · **Status:** ☐

**Steps**
- [ ] `app.routes.ts`: `/home`, `/discover`, `/articles/:id`, `/editor`, `/editor/:id`, `/editor/preview`, `/my-posts`, `/authors`, `/authors/:id`, `/login`, `/profile`, wildcard NotFound — all lazy with titles
- [ ] `authGuard` on `/editor*`, `/my-posts`, `/profile` → `/login?returnUrl=…`
- [ ] `ownerGuard` on `/editor/:id` — owner or `editor` role; otherwise redirect

**Acceptance criteria**
- [ ] Anonymous `/editor` → login with returnUrl; reader cannot open another user's edit route

### T3.2 — App Shell: Navbar, Footer, Toasts, Confirm Dialog
**Plan ref:** §3.2 · **Priority:** P0 · **Estimate:** 2 h · **Depends on:** T3.1 · **Status:** ☐

**Steps**
- [ ] Navbar: global search field (wired in T4.2), Home, Discover, Authors, Write (authors only), avatar menu (My Posts / Profile / Logout) — auth-aware signals
- [ ] Footer; toast service + stack; confirm dialog primitive
- [ ] Active-link styling, route titles, responsive collapse

**Acceptance criteria**
- [ ] Links show/hide by auth state + role; toasts render app-wide

### T3.3 — Login UI (Google/Facebook) & Profile Page
**Plan ref:** §3.2 · **Priority:** P0 · **Estimate:** 2–3 h · **Depends on:** T3.2, T2.3 · **Status:** ☐

**Steps**
- [ ] Login: Google + Facebook buttons, demo-credentials hint, error toasts, `returnUrl` redirect
- [ ] Profile: displayName, bio (≤ 500 with live counter), avatar upload to Storage (≤ 2 MB image)
- [ ] Popup-blocked / provider-error handling with friendly messages

**Acceptance criteria**
- [ ] Both providers sign in and land on `returnUrl` or `/home`
- [ ] Profile edits persist and reflect in navbar/cards

---

## Phase 4 — Reader Experience: Feed, Discover, Authors, Detail

### T4.1 — Home Feed: Featured Strip, Sorts, Cards, Pagination
**Plan ref:** §4.1 · **Priority:** P0 · **Estimate:** 3–4 h · **Depends on:** T3.2 · **Status:** ☐

**Steps**
- [ ] Featured strip: `isFeatured == true` query (editor's-pick highlight)
- [ ] Sort tabs → latest / most popular (`popularityScore desc`) / editor's pick — mapped composite-index queries
- [ ] Category filter chips (client catalog)
- [ ] `ArticleCard`: cover (`NgOptimizedImage`, fallback), title, excerpt, author name + avatar, date, reading time, tags
- [ ] Cursor pagination (`startAfter(publishAt)`): Load more + numbered pages, sizes 6/9/12; skeletons; empty state
- [ ] `feed.store` signals: sort/filters/page/items/loading/hasMore

**Acceptance criteria**
- [ ] Switching sorts/pages hits the right indexed query; only published + due articles ever appear
- [ ] Anonymous users see the full feed; drafts never leak

### T4.2 — Global Search + Search-Index Web Worker
**Plan ref:** §4.3 (spec) / §4.1 (plan) · **Priority:** P0 · **Estimate:** 3 h · **Depends on:** T4.1 · **Status:** ☐

**Steps**
- [ ] Generate worker (`ng g web-worker`); build inverted index (token → ids) from loaded feed pages in batches
- [ ] Navbar search → debounced 300 ms → worker `{type:'search', term, field}` → map ids to cards
- [ ] Fields: keyword (title/excerpt/body), author name, tags; result list view + clear
- [ ] Documented limitation: search covers loaded pages (README notes Algolia path)

**Acceptance criteria**
- [ ] Main thread stays responsive while indexing (no long tasks)
- [ ] Typing produces ≤ 1 search per 300 ms burst; empty/short queries handled

### T4.3 — Discover Page
**Plan ref:** §4.2 · **Priority:** P1 · **Estimate:** 2–3 h · **Depends on:** T4.1 · **Status:** ☐

**Steps**
- [ ] Category chips → filtered feed
- [ ] Popular tags cloud (`tags` orderBy articleCount desc) → tag browsing
- [ ] Readers' choice: top articles by popularityScore
- [ ] Rising authors: cards (avatar, bio excerpt, publishedCount, Follow bonus)

**Acceptance criteria**
- [ ] Tag chip → correct tag-filtered article list; sections render with empty states

### T4.4 — Author Directory & Profile Pages
**Plan ref:** §4.3 · **Priority:** P0 · **Estimate:** 2 h · **Depends on:** T4.1 · **Status:** ☐

**Steps**
- [ ] `/authors`: all users with `publishedCount > 0`; search by name (`nameLower` prefix)
- [ ] `/authors/:id`: avatar, full bio, published articles (author + status + publishAt query), Follow button (bonus)

**Acceptance criteria**
- [ ] Directory shows only published authors; profile lists only live articles

### T4.5 — Article Detail Page
**Plan ref:** §4.4 · **Priority:** P0 · **Estimate:** 3–4 h · **Depends on:** T3.1, T2.3 · **Status:** ☐

**Steps**
- [ ] Render sanitized `contentHtml` (SafeHtmlPipe; DOMPurify re-validate at render); title, author card with bio, date, reading time, cover
- [ ] View counter (once per browser session via `sessionStorage`) + popularityScore bump
- [ ] Related articles (shared tags, exclude self); More from this author
- [ ] Access states: draft → owner/editor only (else 404-style); scheduled → "publishes on …" banner for non-owners; unknown id → NotFound
- [ ] Comments slot (populated in T6.1); document title set to article title

**Acceptance criteria**
- [ ] All spec §5.4 elements render from Firestore
- [ ] Direct URL load works; unauthorized draft access shows friendly state

---

## Phase 5 — Authoring: Editor, Publish, Schedule & Preview

### T5.1 — Editor Form, Quill Rich Text & Media Manager
**Plan ref:** §5.1 · **Priority:** P0 · **Estimate:** 4–5 h · **Depends on:** T3.1, T3.3 · **Status:** ☐

**Steps**
- [ ] `/editor` + `/editor/:id` with reactive form: title (10–200), category select, tags (≤ 5, normalized, suggestions from popular tags)
- [ ] `ngx-quill` with restricted toolbar — bold/italic/underline, bulleted/numbered lists, link, image, video, blockquote, header (spec §5.6)
- [ ] `storage.service`: cover upload + inline image/video inserts; type/size validation (images ≤ 5 MB, mp4 ≤ 25 MB), progress UI, download URLs stored
- [ ] DOMPurify sanitize on save (spec §4.4 allow-list); derive excerpt (≤ 300, word boundary) + readingMinutes
- [ ] Debounced autosave to draft + explicit **Save draft**; unsaved-changes guard (`beforeunload` + route guard)

**Acceptance criteria**
- [ ] Invalid form blocks save with inline errors (title length, ≥ 1 tag)
- [ ] Stored HTML passes the allow-list; oversize/wrong-type files rejected before upload
- [ ] Autosave indicator shows last-saved time; navigation guard prevents accidental loss

### T5.2 — Publish / Schedule / Unschedule + Counter Batches
**Plan ref:** §5.1 · **Priority:** P0 · **Estimate:** 2 h · **Depends on:** T5.1 · **Status:** ☐

**Steps**
- [ ] **Publish now** → `status: 'published'`, `publishAt = serverTimestamp()`
- [ ] **Schedule** → datetime picker (≥ now) sets future `publishAt` (spec §4.1 model — no `scheduled` status)
- [ ] **Unschedule** → revert to draft
- [ ] One `writeBatch`: article write + tag `articleCount` increments + user `publishedCount`
- [ ] Owner-only writes (rules-enforced); failures surfaced via toasts with retry

**Acceptance criteria**
- [ ] Scheduled article invisible in feed/rules until `publishAt` passes (verified against emulator)
- [ ] Counters correct after publish → unschedule → publish cycles; tag cloud reflects counts

### T5.3 — Preview Step & My Posts Dashboard
**Plan ref:** §5.2–§5.3 · **Priority:** P0 · **Estimate:** 2–3 h · **Depends on:** T5.2, T4.5 · **Status:** ☐

**Steps**
- [ ] `EditorDraftService` holds the composed article; `/editor/preview` (guarded) reuses the detail view in **preview mode** ("DRAFT PREVIEW" banner, interactions hidden)
- [ ] **Edit** returns to the form with state intact; **Publish/Schedule** dispatches; success navigates to the live article
- [ ] `/my-posts` tabs: Drafts / Scheduled (publishAt countdown) / Published (views · likes · comments stats)
- [ ] Row actions: edit, publish now, unschedule, delete draft (confirm dialog)

**Acceptance criteria**
- [ ] Preview renders 1:1 vs a published detail page (minus interactions)
- [ ] My Posts buckets match seed/state; only drafts deletable (rules)

---

## Phase 6 — Comments & Interactions

### T6.1 — Comment Thread: Tree, Sorts, Likes, Delete Cleanup
**Plan ref:** §6.1 · **Priority:** P0 · **Estimate:** 3–4 h · **Depends on:** T4.5 · **Status:** ☐

**Steps**
- [ ] `comment-thread` component: one indexed fetch (`articleId`, createdAt asc) → client-built tree, depth cap 5, indentation per level
- [ ] Sorts: newest / oldest / most liked (applied to roots and replies); relative timestamps
- [ ] Composer + per-node reply (authenticated-only; anonymous users get a sign-in prompt); optimistic add with rollback
- [ ] Like toggle on comments (`likedBy` cap + likeCount); author snapshots denormalized at write time
- [ ] Delete own comments (root deletes descendants in one batch; `commentCount` adjusted); editors can delete any

**Acceptance criteria**
- [ ] Replies nest under the correct parent; sort switching reorders roots + replies
- [ ] `commentCount` stays consistent after add/delete; anonymous POST blocked by rules

### T6.2 — Engagement Bonus Set
**Plan ref:** §6.2 · **Priority:** P1 · **Estimate:** 2–3 h · **Depends on:** T4.5 · **Status:** ☐

**Steps**
- [ ] Article like toggle (`likedBy` cap 100 + `likeCount` + popularityScore bump)
- [ ] Bookmarks (`users/{uid}/bookmarks`) + saved indicator on cards/detail
- [ ] Author follow (`following` subcollection + `followerCount`)

**Acceptance criteria**
- [ ] Toggles are idempotent and rules-safe; state persists after reload

---

## Phase 7 — Testing, Polish & Deployment

### T7.1 — Unit Tests (Jasmine/Karma)
**Plan ref:** §7.1 · **Priority:** P0 · **Estimate:** 3–4 h · **Depends on:** T5.1, T6.1 · **Status:** ☐

**Steps**
- [ ] `ArticleService` spec: query construction per sort/filter (emulator-backed or mocked AngularFire), publish/schedule transitions, counter increments, popularity math
- [ ] `CreateEditArticleComponent` spec: validation gates, draft save, publish/schedule dispatch, preview hand-off
- [ ] Stretch: `CommentService` tree building/sorts; `authGuard`/`ownerGuard`; search worker tokenization

**Acceptance criteria**
- [ ] `ng test --watch=false --browsers=ChromeHeadless` passes fully green
- [ ] Spec §6.5 satisfied: ≥ 1 major component + ≥ 1 service under test

### T7.2 — UX & Accessibility Polish Pass
**Plan ref:** §7.2 · **Priority:** P1 · **Estimate:** 3 h · **Depends on:** T4.1–T6.2 · **Status:** ☐

**Steps**
- [ ] Skeletons / empty / error states on every data surface; toasts on all failures
- [ ] Responsive pass (375 / 768 / 1280 px); keyboard focus states, labels, alt text
- [ ] Dark mode toggle (bonus); console clean; bundle budgets green

**Acceptance criteria**
- [ ] Manual smoke pass at all widths with zero console errors in normal flows

### T7.3 — Deploy to Firebase Hosting, README & Deliverables Checklist
**Plan ref:** §7.3 · **Priority:** P0 · **Estimate:** 2 h · **Depends on:** T7.1, T7.2 · **Status:** ☐

**Steps**
- [ ] Production build → Firebase Hosting with SPA rewrite `/* → /index.html`
- [ ] Deploy prod rules + indexes; run seeder against prod (demo accounts + sample content)
- [ ] `README.md`: repo link, live URL, demo credentials (author/editor + note on Google/Facebook), architecture overview, run/test/deploy commands, bonus features
- [ ] Tick the Final Deliverables Checklist below; tag a release commit

**Acceptance criteria**
- [ ] Public URL serves the app; deep links survive a hard refresh; demo credentials log in
- [ ] A reviewer can run, test, and demo the app from the README alone

---

## Definition of Done — Project-Wide

- All P0 tasks `✅ Done`; P1 tasks done or explicitly descoped with a note
- `ng build` and `ng test` pass locally; emulators run the seeded data
- End-to-end happy paths verified on the deployed URL: browse → search → detail → comment (reader) · login → draft → schedule/publish → preview (author) · feature/unfeature + moderation (editor)
- No secrets in the repo; `.gitignore` verified
- Web worker demonstrably runs the search index off the main thread (spec §7)

## Final Deliverables Checklist (spec §8)

- [ ] Fully functional web application (feed, search, discover, authors, detail, comments, editor, drafts, scheduling, tags)
- [ ] Unit tests for ≥ 1 major component and ≥ 1 service
- [ ] GitHub repository with source code (no `node_modules`)
- [ ] Deployed frontend on a free hosting provider (Firebase Hosting)
- [ ] `README.md`: repo link, live URL, demo credentials, bonus features
- [ ] Web worker used for a background task (search index)
- [ ] Bonus implemented (document which): dark mode / likes / bookmarks / follow / trending topics

## Change Log

| Date | Update | Tasks touched |
| :--- | :--- | :--- |
| 2026-09-22 | Initial task breakdown generated from the specification + technical spec + implementation plan (23 tasks across 7 phases) | All |
| 2026-09-22 | End-to-end implementation executed (Phases 1–7 code complete). Build ✅, tests ✅ 40/40 (Vitest), serve smoke ✅. Deviations: Firebase JS SDK (no AngularFire on Angular 22), Vitest instead of Karma, SCSS-only styling, editor role promoted via console | T1.1–T7.1, T7.3 (README) |

---

## Progress Snapshot — Implementation (2026-09-22)

**Status:** T1.1 ✅ · T1.2 🔶 (console providers pending) · T1.3 ✅ authored / deploy pending · T2.1–T2.4 ✅ (seeder run pending) · T3.1–T3.3 ✅ · T4.1–T4.5 ✅ · T5.1–T5.3 ✅ · T6.1–T6.2 ✅ · T7.1 ✅ · T7.2 🔶 · T7.3 🔶 (README ✅, deploy pending `firebase login`)

**Evidence**
- `npm run build` → green, 926 kB raw / 244 kB transfer; worker chunk emitted (`search-index-worker`).
- `npx ng test --watch=false` → **40 tests / 7 files passing** (`@angular/build:unit-test` + Vitest).
- `ng serve` smoke → HTTP 200 at `/home` with `<app-root>`.
- Code: `c:\work\Angular basics\online-pub\` (`pubhub-client/` workspace + repo-root `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `.firebaserc`, `README.md`). Full detail: `OnlinePubApp_execution.log.md`.

**Implementation deviations from this tracker** (mirrored in README + log):
1. `@angular/fire` → **Firebase JS SDK v12 directly** (AngularFire 20 peer-requires Angular ^20; this workspace is Angular 22).
2. Jasmine/Karma → **Vitest** (Angular 22 native test runner; no browser install required).
3. Tailwind CSS v4 → **SCSS design system** (satisfies the "CSS preprocessor" requirement; removes build risk).
4. Workspace lives at `online-pub/pubhub-client` (not `/frontend/pubhub-client` as plan §1.1 assumed).
5. Editor role is seeded as `author`; promotion to `editor` happens in the Firestore console (our own rules forbid self-promotion).

**Indexes added vs spec §2.3:** `articles(authorId ASC, createdAt DESC)` for My Posts and `tags(articleCount DESC)` for the popular-tags cloud.

**Remaining:** Firebase console provider enablement → run seeder → promote editor + apply picks → `firebase login` and deploy → optional manual responsive/a11y pass.
