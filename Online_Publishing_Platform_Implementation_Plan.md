# Implementation Plan: Online Publishing Platform

Phased roadmap to build, test, and deploy the **Online Publishing Platform ("PubHub")** Angular application, based on its technical specification (`Online_Publishing_Platform_Technical_Specification.md`). Backend services are **Firebase** (Auth, Firestore, Storage, Hosting); all application code lives in one Angular workspace.

---

## Sprint Overview & Milestones

| Phase | Focus Area | Key Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | Scaffolding & Firebase Setup | Repo + Angular workspace, Firebase project (Auth/Storage), security rules + composite indexes, SCSS tokens |
| **Phase 2** | Data Layer & Core Services | AngularFire wiring, models, AuthService + role sync, seed service, demo accounts |
| **Phase 3** | App Shell & Authentication | Routing + guards, navbar/footer, Google/Facebook login, profile page |
| **Phase 4** | Home Feed, Discover & Detail | Featured strip, sorts, debounced search + web worker, paginated grid, author directory, detail + related |
| **Phase 5** | Authoring: Editor, Publish & Schedule | Quill editor + media manager, publish/schedule/unschedule, preview step, My Posts |
| **Phase 6** | Comments & Interactions | Threaded comment tree, sorts, likes, delete cleanup, bonus engagement set |
| **Phase 7** | Testing, Polish & Deployment | Jasmine/Karma suites, UX/a11y polish, Firebase Hosting deploy, README |

---

## Phase 1: Workspace Setup & Firebase Scaffolding

### 1.1 Repository & Angular Workspace
- Repo layout: root `README.md`, `.gitignore` (exclude `node_modules/`, `dist/`, `.angular/`, `.firebase/`, key-bearing environment files, debug logs), `/frontend` Angular workspace, `/infra` for rules + indexes.
- Scaffold: `ng new pubhub-client --routing --style=scss --standalone` (latest stable Angular CLI) inside `/frontend`.
- Install: `firebase`, `@angular/fire`, `ngx-quill`, `quill`, `dompurify` (+ `@types/dompurify`).
- Global SCSS: design tokens (colors, spacing, typography), utility layer, dark-theme variables.

### 1.2 Firebase Project Configuration
- Create free Firebase project; register web app; enable providers: **Google**, **Facebook** (Meta app id/secret), **Email/Password** (demo accounts only).
- Create **Cloud Firestore** (production mode) and the **Storage** bucket; note free-tier quotas.
- `environments/environment.ts|prod`: firebase config, `useEmulators` flag, demo credentials constant.
- Dev experience: Firebase **local emulators** (Auth + Firestore + Storage) behind the flag for offline development.

### 1.3 Firestore Security Rules & Indexes (in `/infra`)
- Ship spec §3.2 rules verbatim (users, articles, comments, tags, bookmarks, following) + Storage rules (spec §4.6).
- `firestore.indexes.json`: all composite indexes from spec §2.3 (feed sorts, featured, category, tags, author, comments).
- Deploy check: `firebase deploy --only firestore:rules,firestore:indexes,storage` (or emulator load).

---

## Phase 2: Data Layer, Auth & Core Services

### 2.1 Models & Config
- Typed models in `core/models`: `AppUser` (uid, displayName, email, photoURL, bio, role, publishedCount, nameLower), `Article` (status, publishAt, counters, popularityScore, tags…), `ArticleCard` (list projection), `CommentNode`, `TagSummary`, fixed `Category` catalog.

### 2.2 AngularFire Wiring
- `app.config.ts`: `provideFirebaseApp`, `provideAuth`, `provideFirestore`, `provideStorage` (+ emulator connect when flagged).

### 2.3 AuthService & User Profiles
- Social sign-in (`signInWithPopup` Google/Facebook), logout, `returnUrl` redirect support.
- Auto-provision `users/{uid}` on first sign-in (`role: 'reader'`, `nameLower`, counters at 0); profile read/update (bio, displayName, avatar).
- Expose `user`, `profile`, `role` **signals**; email/password path used only for seeded demo accounts.

### 2.4 Seed Service (dev-only)
- Idempotent seeder: demo author + editor accounts (`author@demo.com` / `Author@123!`, `editor@demo.com` / `Editor@123!`), 2–3 authors with bios, ≥ 10 published articles (2 featured, mixed categories/tags/stock images), 1 scheduled (`publishAt = now + 2 days`), 1 draft, threaded comments, tag counters, `publishedCount` values.

---

## Phase 3: App Shell, Routing & Authentication UI

### 3.1 Routing & Guards
- Lazy feature routes with titles: `/home`, `/discover`, `/articles/:id`, `/editor`, `/editor/:id`, `/editor/preview`, `/my-posts`, `/authors`, `/authors/:id`, `/login`, `/profile`, wildcard NotFound.
- `authGuard` (signed-in) on editor/my-posts/profile/preview; `ownerGuard` on `/editor/:id` (owner or editor role).

### 3.2 App Shell & Auth UI
- Navbar: global search field, Home, Discover, Authors, Write (authors), avatar menu (My Posts, Profile, Logout) — auth-aware via signals.
- Footer, toast container, confirm dialog primitives.
- Login screen: Google + Facebook buttons, demo hint, error toasts, post-login redirect (`returnUrl`).
- Profile page: display name, bio (≤ 500 with counter), avatar upload to Storage.

---

## Phase 4: Home Feed, Discover & Article Detail

### 4.1 Home / Article Feed (`/home`)
- **Featured strip** (`isFeatured == true` query) above the feed.
- **Sort tabs:** latest / most popular (`popularityScore desc`) / editor's pick — each a mapped composite-index query.
- **Search bar** (keyword + author name) → web-worker index over loaded pages; debounced 300 ms.
- **Article cards:** cover, title, excerpt, author name + avatar, publish date, reading time, tags; loading skeletons; empty state.
- **Cursor pagination:** "Load more" + numbered pages (`startAfter`), page sizes 6/9/12; category filter chips.

### 4.2 Discover (`/discover`)
- Category chips, **popular tags cloud** (`tags` orderBy articleCount desc).
- **Readers' choice:** trending articles by popularityScore.
- **Rising authors:** author cards (avatar, bio excerpt, publishedCount, Follow bonus action).

### 4.3 Author Directory & Profiles (`/authors`, `/authors/:id`)
- Directory listing authors with `publishedCount > 0`; name search (prefix via `nameLower`).
- Author profile: avatar, full bio, follow (bonus), their published articles (author + status query).

### 4.4 Article Detail (`/articles/:id`)
- Render sanitized HTML (DOMPurify at save + render), title, author card w/ bio, publish date, reading time, cover.
- View counter (once per session) + popularityScore bump; **related articles** (shared tags, exclude self); **more from this author**.
- Access control: draft → owner/editor only; scheduled (future publishAt) → friendly "publishes on …" state for non-owners; unknown id → NotFound state.
- Comments panel placeholder wired in Phase 6.

---

## Phase 5: Authoring — Editor, Publish, Schedule & Preview

### 5.1 Create/Edit Article (`/editor`, `/editor/:id`)
- Reactive form: title (10–200), category select, tags (≤ 5, normalized, popular-tag suggestions), Quill rich-text body (restricted toolbar per spec §5.6).
- **Media manager:** cover image upload + inline image/video inserts via Storage (`storage.service`), type/size validation, progress UI.
- Autosave-to-draft (debounced) + explicit **Save draft**; excerpt auto-derived; reading time computed.
- **Publish now** (`serverTimestamp()`), **Schedule** (datetime picker ≥ now), **Unschedule** (revert to draft) — counter updates (`publishedCount`, tag `articleCount`) in one batch.

### 5.2 Preview Step (`/editor/preview`)
- `EditorDraftService` hands the composed article to a guarded preview route that reuses the detail view in **preview mode** (banner, interactions hidden).
- **Edit** returns with state intact; **Publish/Schedule** dispatches writes; success navigates to the live article; failure shows a recoverable error.

### 5.3 My Posts (`/my-posts`)
- Tabs: **Drafts**, **Scheduled** (publishAt countdown), **Published** (views/likes/comments stats).
- Row actions: edit, publish now, unschedule, delete draft (confirm dialog).

---

## Phase 6: Comments & Interactions

### 6.1 Comment Thread (`comment-thread` component)
- One indexed fetch (`articleId`, createdAt asc) → client-built tree (spec §4.5); depth-capped nesting with indentation.
- Sorts: newest / oldest / most liked; relative timestamps; optimistic add with rollback.
- Authenticated-only composer + per-node reply; anonymous users get a sign-in prompt.
- Like toggle on comments; author snapshots denormalized at write time.
- Delete: own comments (root deletes descendants in a batch; `commentCount` adjusted); editors can delete any.

### 6.2 Reactions & Engagement (bonus set)
- Article like toggle (`likedBy` cap 100 + counter), bookmarks, author follow — same store/batch patterns.

---

## Phase 7: Testing, Polish & Deployment

### 7.1 Unit Tests (Jasmine/Karma, ChromeHeadless)
- **Service:** `ArticleService` — query construction per sort/filter (emulators or mocked AngularFire), publish/schedule transitions, counter increments, popularity math.
- **Component:** `CreateEditArticleComponent` — form validation gates, draft save, publish/schedule dispatch, preview hand-off.
- **Stretch:** `CommentService` tree building/sorts; `authGuard`/`ownerGuard` behavior; search worker tokenization.

### 7.2 UX & Accessibility Polish
- Skeletons, empty/error states everywhere; responsive pass (mobile-first); keyboard focus states + labels/alt text; dark mode toggle (bonus); console clean; bundle budgets respected.

### 7.3 Deployment & Deliverables
- `ng build --configuration production` → **Firebase Hosting** with SPA rewrite `/* → /index.html`; production Firestore rules + indexes deployed.
- README: repo link, live URL, demo credentials (author/editor + note on Google/Facebook), architecture overview, run/test/deploy commands, bonus features.
- Final deliverables checklist ticked (spec §8).

---

## Sequencing Notes
- **Data contract first:** rules, indexes, and models (Phases 1–2) freeze the data shape; all UI work depends only on services, enabling parallel streams afterwards.
- **Feed (4.x) and Editor (5.x) can proceed in parallel** once Phase 3 lands; comments (6.x) needs detail (4.4) but not the editor.
- Emulator-first development keeps the build testable without network; deploy to real Firebase in Phase 7.