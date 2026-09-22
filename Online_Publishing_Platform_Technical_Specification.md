# Online Publishing Platform — Technical Specification

## 1. System Architecture & Overview

The Online Publishing Platform ("PubHub") is a **frontend-focused Angular SPA** backed by **Firebase** as a free Backend-as-a-Service (BaaS). The specification mandates (§5.1) social login through a free authentication service (Auth0/Firebase) and (§8) only requires a deployed frontend — therefore no custom backend is developed. **Firebase Authentication** provides Google/Facebook sign-in, **Cloud Firestore** persists content with **security rules acting as the authorization layer**, **Firebase Storage** hosts uploaded media, and **Firebase Hosting** serves the production SPA.

```
+---------------------------------------------------------------+
|                 Angular Frontend (Client SPA)                 |
|  - Standalone Components / Lazy Feature Routes                |
|  - Signal-based State Stores (Auth, Feed, Comments, Editor)   |
|  - Web Worker: client-side search index (background task)     |
|  - Route Guards (auth / ownership) + HTML Sanitization        |
+---------------------------------------------------------------+
                               |
              Firebase JS SDK (AngularFire) — HTTPS / WSS
                               |
    +------------------+--------------------+-------------------+
    v                  v                    v                   v
+-----------+  +------------------+  +----------------+  +-----------+
| Firebase  |  | Cloud Firestore  |  | Firebase       |  | Firebase  |
| Auth      |  | - articles       |  | Storage        |  | Hosting   |
| - Google  |  | - comments       |  | - cover images |  | - SPA +   |
| - Facebook|  | - users / tags   |  | - inline media |  |  rewrite  |
| - email*  |  | - SECURITY RULES |  |                |  |           |
+-----------+  +------------------+  +----------------+  +-----------+
   * email/password enabled only for seeded demo accounts
```

### 1.1 Technology Stack

| Layer | Technology | Notes |
| :--- | :--- | :--- |
| Framework | Angular (latest stable) via Angular CLI | Standalone components, lazy routes, signals |
| Styling | SCSS (required preprocessor) + Tailwind CSS v4 | SCSS design tokens + utility classes |
| Authentication | Firebase Authentication | Google + Facebook OAuth (popup); email/password **only** for demo accounts |
| Database | Cloud Firestore (NoSQL, Spark free tier) | Security rules enforce all authorization |
| Media storage | Firebase Storage | Article covers + inline images |
| Rich text | Quill via `ngx-quill` | Restricted toolbar per spec §5.6 |
| Sanitization | DOMPurify + Angular sanitizer | Allow-list for stored article HTML |
| State management | Angular signals + store services | RxJS interop (`toSignal`) for Firestore streams |
| Background task | Web Worker (search index) | Satisfies spec §7 web-worker requirement |
| Testing | Jasmine + Karma (ChromeHeadless) | ≥ 1 major component + ≥ 1 service (spec §6.5) |
| Hosting | Firebase Hosting (free) | SPA rewrite `/* → /index.html` |

### 1.2 Key Architectural Decisions

| # | Decision | Choice | Rationale |
| :--- | :--- | :--- | :--- |
| D1 | Custom backend vs BaaS | Firebase | Requirements mandate a free social-login service (§5.1) and list no backend deliverable (§8); Firestore security rules replace server-side authorization at zero ops cost. |
| D2 | Firebase vs Supabase | Firebase | Named explicitly in the requirements; Google/Facebook popup OAuth plus Storage & Hosting free tiers out of the box; AngularFire SDK is first-class. Supabase (Postgres + RLS) is the documented alternative. |
| D3 | Scheduled publishing | `status` + `publishAt` modeling | Cloud Scheduler / Cloud Functions require the Blaze billing plan. Scheduled posts are stored `status='published'` with a future `publishAt`; rules + queries hide them until due (§4.1). |
| D4 | Full-text search | Web-worker inverted index | Firestore has no native full-text search; an in-worker index over loaded pages gives instant keyword/author search and satisfies the web-worker requirement (§4.3). Algolia/Typesense noted as the production path. |
| D5 | State management | Signal stores | Right-sized for this app; fewer dependencies than NgRx; Firestore observables bridge cleanly via `toSignal` (§5.3). |
| D6 | Comment threading | Flat storage + client-built tree | One indexed query per article; tree + sorts built client-side keeps reads O(1) per article and free-tier friendly. |

---

## 2. Data Model (Cloud Firestore)

### 2.1 Entity Relationship Diagram (textual)

```
[users/{uid}]                          (doc id = Firebase Auth uid)
  displayName, email, photoURL
  bio (string ≤ 500; cards show first 160)
  role: 'reader' | 'author' | 'editor'
  publishedCount (number, denormalized)
  followerCount (number, denormalized — bonus)
  nameLower (string, directory prefix search)
  createdAt (timestamp)
     |
     |-- sub: bookmarks/{articleId}    (bonus) addedAt + denormalized card fields
     |-- sub: following/{authorUid}    (bonus) followedAt

[articles/{articleId}]
  authorId (= users.uid), authorName, authorPhoto   (denormalized for cards)
  title (≤ 200), excerpt (≤ 300, auto-derived), contentHtml (sanitized)
  coverImageUrl, category (catalog), tags[] (≤ 5, lowercase)
  status: 'draft' | 'published'
  isFeatured (editor's pick; editor-role only)
  publishAt (timestamp: publish moment; future value = scheduled)
  createdAt, updatedAt
  readingMinutes, viewCount, likeCount, commentCount
  popularityScore (number: views + 5×likes + 2×comments)
  likedBy (uid[] capped at 100)
  authorNameLower (string, search support)
     |
     |-- 1:N --> [comments/{commentId}]
                   articleId (= articles doc id)
                   parentCommentId (nullable — self-reference for replies)
                   authorId, authorName, authorPhoto (denormalized)
                   message (≤ 2000), likeCount, likedBy[] (capped 100)
                   createdAt

[tags/{tagName}]                       (doc id = normalized tag)
  name, articleCount (denormalized), updatedAt
```

Categories are a **fixed client-side catalog** (`core/config/categories.ts`) — e.g. Technology, Design, Business, Science, Culture, Tutorials, Opinion, Travel — no collection required.

### 2.2 Collection Schemas

**users/{uid}**

| Field | Type | Rules / Constraints |
| :--- | :--- | :--- |
| displayName | string | ≤ 80 chars, required |
| email | string | from Auth provider |
| photoURL | string | Google/Facebook avatar |
| bio | string | ≤ 500 chars |
| role | string | `reader` (default) \| `author` \| `editor` |
| publishedCount | number | ≥ 0, maintained on publish/unpublish |
| followerCount | number | ≥ 0, bonus feature |
| nameLower | string | derived, directory search |
| createdAt | timestamp | `serverTimestamp()` |

**articles/{articleId}**

| Field | Type | Rules / Constraints |
| :--- | :--- | :--- |
| authorId | string | = `request.auth.uid` (rules-enforced) |
| authorName / authorPhoto | string | denormalized author snapshot |
| title | string | 10–200 chars |
| excerpt | string | ≤ 300 chars, auto-derived from content |
| contentHtml | string | sanitized against allow-list (§4.4) |
| coverImageUrl | string | Storage download URL or empty |
| category | string | one of the fixed catalog |
| tags | string[] | ≤ 5, normalized lowercase |
| status | string | `draft` \| `published` |
| isFeatured | boolean | default `false`; writable only by `editor` |
| publishAt | timestamp | publish moment; future = scheduled |
| createdAt / updatedAt | timestamp | `serverTimestamp()` |
| readingMinutes | number | ceil(words / 200) |
| viewCount / likeCount / commentCount | number | denormalized counters |
| popularityScore | number | views + 5×likes + 2×comments; maintained via increments |
| likedBy | string[] | capped at 100 uids |
| authorNameLower | string | derived, search support |

**comments/{commentId}**

| Field | Type | Rules / Constraints |
| :--- | :--- | :--- |
| articleId | string | parent article must be public (rules) |
| parentCommentId | string \| null | reply target; validated client-side |
| authorId | string | = `request.auth.uid` (rules) |
| authorName / authorPhoto | string | denormalized author snapshot |
| message | string | 1–2000 chars |
| likeCount / likedBy | number / string[] | capped at 100 uids |
| createdAt | timestamp | `serverTimestamp()` |

**tags/{tagName}**

| Field | Type | Rules / Constraints |
| :--- | :--- | :--- |
| name | string | normalized lowercase (= doc id) |
| articleCount | number | maintained on publish/unpublish |
| updatedAt | timestamp | |

### 2.3 Composite Indexes (`firestore.indexes.json`)

| Collection | Fields (order) | Serves |
| :--- | :--- | :--- |
| articles | status ASC, publishAt DESC | home feed — "latest" |
| articles | status ASC, popularityScore DESC | "most popular" sort |
| articles | status ASC, isFeatured DESC, publishAt DESC | featured / editor's-pick strip |
| articles | status ASC, category ASC, publishAt DESC | category browsing |
| articles | status ASC, tags ARRAY, publishAt DESC | tag browsing |
| articles | status ASC, authorId ASC, publishAt DESC | author profile page |
| comments | articleId ASC, createdAt ASC | comment thread fetch |
| users | publishedCount ASC(>0), nameLower ASC | author directory |

---

## 3. Security & Access Control (Firestore Security Rules)

### 3.1 Role Model

| Role | Capabilities |
| :--- | :--- |
| `reader` (default, every signed-in user) | Read published content; comment; like; bookmark; follow (bonus) |
| `author` | reader + create/edit/publish/schedule own articles; delete own drafts |
| `editor` (moderator) | author + set/clear `isFeatured`; edit/unpublish/delete **any** article; delete **any** comment |

Role lives on `users/{uid}.role`. Self-service promotion `reader → author` is allowed (users may start writing at any time); `editor` can only be granted by another `editor` (or via the seed script / Firebase console).

### 3.2 Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn()  { return request.auth != null; }
    function isSelf(uid) { return signedIn() && request.auth.uid == uid; }
    function myRole()    { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }
    function isEditor()  { return signedIn() && myRole() == 'editor'; }

    // Publicly visible = published AND its publish moment has passed
    function publicArticle(a) {
      return a.status == 'published'
        && (!('publishAt' in a) || a.publishAt <= request.time);
    }
    function publicArticleById(id) {
      return publicArticle(get(/databases/$(database)/documents/articles/$(id)).data);
    }

    match /users/{uid} {
      allow read: if true;
      allow create: if isSelf(uid)
        && request.resource.data.role in ['reader', 'author'];   // no self-editor
      allow update: if (isSelf(uid) && (
          request.resource.data.role == resource.data.role ||
          (resource.data.role == 'reader' && request.resource.data.role == 'author')))
        || isEditor();
      allow delete: if false;
    }

    match /articles/{articleId} {
      allow get, list: if publicArticle(resource.data)
        || (signedIn() && resource.data.authorId == request.auth.uid)
        || isEditor();

      allow create: if signedIn()
        && request.resource.data.authorId == request.auth.uid
        && request.resource.data.status in ['draft', 'published']
        && request.resource.data.isFeatured == false;            // only editors feature

      allow update: if (signedIn()
                        && resource.data.authorId == request.auth.uid
                        && request.resource.data.authorId == resource.data.authorId)
        || isEditor();

      allow delete: if (signedIn()
                        && resource.data.authorId == request.auth.uid
                        && resource.data.status == 'draft')
        || isEditor();
    }

    match /comments/{commentId} {
      allow read: if publicArticleById(resource.data.articleId);
      allow create: if signedIn()
        && request.resource.data.authorId == request.auth.uid
        && publicArticleById(request.resource.data.articleId)
        && request.resource.data.message.size() > 0
        && request.resource.data.message.size() <= 2000;
      allow update: if signedIn() && resource.data.authorId == request.auth.uid; // like toggles
      allow delete: if signedIn() && resource.data.authorId == request.auth.uid
        || isEditor();
    }

    match /tags/{tagId} {
      allow read: if true;
      // Pragmatic free-tier choice: counters maintained by the publishing client
      // via FieldValue.increment inside a batch. Production: Cloud Function.
      allow write: if signedIn();
    }

    match /users/{uid}/bookmarks/{articleId} {   // bonus
      allow read, write: if isSelf(uid);
    }
    match /users/{uid}/following/{authorUid} {   // bonus
      allow read, write: if isSelf(uid);
    }
  }
}
```

### 3.3 Editor Bootstrap
- The seed script (T2.3) creates `editor@demo.com` with `role = 'editor'` via a direct write (admin/console context).
- Additional editors are promoted manually in the Firebase console.

### 3.4 Known Limitations & Mitigations (free-tier scope)

| Limitation | Mitigation |
| :--- | :--- |
| No server-side rate limiting | Message length caps in rules; client-side submit cooldowns |
| Denormalized counters are client-writable | Acceptable for scope; production moves counters to Cloud Functions |
| `request.time` has ~minutes granularity | Acceptable for scheduled-publishing UX |
| Comment author snapshots can go stale | Acceptable; profile edits optionally refresh own comment snapshots |

---

## 4. Core Business Logic

### 4.1 Publishing Lifecycle & Scheduled Publishing

```
              publish(now)                  LIVE  (publishAt <= now)
  [draft] ------------------------> [published] ------------------->
     ^                                  |
     |   schedule(ts)  publishAt = ts   |
     +--------- [scheduled window] <----+
                unschedule / revert to draft
```

- There is **no `scheduled` status**; scheduled = `status:'published'` with a future `publishAt`.
- Visibility is enforced twice: the feed query filters `publishAt <= now` and the security rules require `publishAt <= request.time` — no Cloud Functions/Cloud Scheduler needed (they require the Blaze plan).
- **My Posts** buckets the author's articles: Drafts (`status='draft'`), Scheduled (`publishAt > now`), Published (`publishAt <= now`).
- "Publish now" on a scheduled article overwrites `publishAt` with `serverTimestamp()`; "Unschedule" reverts it to draft.
- `isFeatured` (editor's pick) is toggled only by the `editor` role — rules-enforced.

### 4.2 Denormalized Counters & Likes

| Counter | Document | Updated when |
| :--- | :--- | :--- |
| viewCount (+ popularityScore) | articles | article detail viewed (once per browser session via `sessionStorage` guard) |
| likeCount + likedBy (+ popularityScore) | articles / comments | like toggle: one `writeBatch` with `arrayUnion/arrayRemove` + `increment(±1)` |
| commentCount (+ popularityScore) | articles | comment added / deleted (incl. batched descendant deletions) |
| publishedCount | users | article published / unpublished |
| articleCount | tags | article published / unpublished |

- `likedBy` is capped at 100 uids — beyond that only the counter increments (documented trade-off).
- All counter updates use `FieldValue.increment()` inside `writeBatch`/`runTransaction` so repeated clicks stay consistent; `popularityScore = viewCount + 5·likeCount + 2·commentCount` drives the "Most Popular" sort without a multi-field aggregation query.

### 4.3 Search & Discovery — Web Worker

- The **Web Worker** (`src/app/workers/search-index.worker.ts`) builds an in-memory **inverted index** (token → article ids) from the currently loaded article pages — the required "background task" (spec §7).
- Indexing runs in batches via `postMessage`, so typing and scrolling never jank the main thread.
- Worker query API: `{ type: 'search', term, field: 'any' | 'title' | 'author' }` → scored doc-id results; the main thread maps ids to already-loaded article cards.
- Search scope = keyword (title + excerpt + body text), author name, tags; the feed limits query size and documents the pagination limit in the UI.
- Production note: Algolia/Typesense extensions for exhaustive search (documented in README).

### 4.4 Rich Text: Sanitization & Rendering

- **Editor:** `ngx-quill` toolbar restricted to: bold, italic, underline, bulleted list, numbered list, link, image, video, blockquote, header.
- **On save:** HTML passes through **DOMPurify** with an explicit allow-list (tags `p, br, strong, em, u, ul, ol, li, a, img, iframe, blockquote, h1–h6, figure, figcaption`; attributes `href, src, alt, target, rel` + Quill classes).
- **On render:** `[innerHTML]` combined with `bypassSecurityTrustHtml(purified)` in a dedicated `SafeHtmlPipe` — sanitization happens once at save (stored clean) and is re-validated at render.
- Embedded `iframe`s restricted to `youtube.com/embed` and `player.vimeo.com` hosts.
- **Excerpt** derived by stripping tags and truncating to 300 chars at a word boundary; **readingMinutes** = ceil(words / 200).

### 4.5 Comments — Tree, Sorting, Cleanup

- **Fetch:** one indexed query (`where articleId == X`, `orderBy createdAt asc`) → **client-built** reply tree (`id → node` map, `parentCommentId` links); flat storage avoids recursive reads.
- **Sorts** (spec §5.5): newest / oldest (createdAt), most liked (likeCount) — applied to root comments and each reply level.
- **Add:** authenticated-only (rules-enforced); optimistic append with rollback on failure.
- **Delete:** deleting a root comment deletes its descendant replies in the same batch (collection-group query) and decrements `commentCount` by the affected count; editors can delete any.
- **Depth cap:** replies allowed to a practical depth of 5 (client-enforced) for readability.

### 4.6 Media Upload Rules (Firebase Storage)

```
match /articles/{articleId}/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth != null
    && firestore.get(/databases/(default)/documents/articles/$(articleId)).data.authorId == request.auth.uid
    && request.resource.size <= 5 * 1024 * 1024
    && request.resource.contentType.matches('image/.*|video/mp4');
}
match /avatars/{uid}/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.uid == uid
    && request.resource.size <= 2 * 1024 * 1024
    && request.resource.contentType.matches('image/.*');
}
```

- Cover images ≤ 5 MB (images), inline video ≤ 25 MB (mp4) — documented; the editor surfaces file-type/size errors before upload.
- Uploads expose **CORS-enabled download URLs** stored on the article document.

---

## 5. Angular Frontend Architecture

### 5.1 Project Folder Structure

```
src/app/
├── core/
│   ├── guards/
│   │   ├── auth.guard.ts            # signed-in required (editor, my-posts, preview…)
│   │   └── owner.guard.ts           # /editor/:id only for owner or editor role
│   ├── models/
│   │   ├── user.model.ts            # AppUser, UserRole
│   │   ├── article.model.ts         # Article, ArticleCard, ArticleStatus, PagedArticles
│   │   ├── comment.model.ts         # CommentNode, CommentSort
│   │   └── tag.model.ts             # TagSummary, Category
│   ├── config/
│   │   └── categories.ts            # fixed category catalog + tag normalization helpers
│   ├── services/
│   │   ├── auth.service.ts          # AngularFireAuth wrapper + users/{uid} sync + role signals
│   │   ├── article.service.ts       # feed queries (sorts/pagination), drafts, publish/schedule
│   │   ├── author.service.ts        # directory (publishedCount > 0), profiles, user articles
│   │   ├── comment.service.ts       # thread fetch, tree build, add/delete, like toggle
│   │   ├── tag.service.ts           # popular tags, tag browsing
│   │   ├── storage.service.ts       # cover/inline media uploads → download URLs
│   │   └── seed.service.ts          # dev-only demo data (spec §7)
│   ├── stores/
│   │   ├── auth.store.ts            # signal store: user, profile, role
│   │   └── feed.store.ts            # signal store: sort/filter, page, items, loading flags
│   └── workers/
│       └── search-index.worker.ts   # inverted index + tokenized search (spec §7 worker)
├── features/
│   ├── home/                        # featured strip, sort tabs, search, grid, pagination
│   ├── discover/                    # categories, tag cloud, readers' choice, rising authors
│   ├── article-detail/              # reader, author card, related, view counter, comments
│   ├── editor/                      # create/edit, preview step, media manager
│   ├── my-posts/                    # drafts / scheduled / published tabs
│   └── auth/                        # login (social), profile edit
├── shared/
│   ├── components/                  # navbar, footer, article-card, pagination, tag-chips,
│   │                                # comment-thread, author-card, toast, confirm-dialog
│   └── pipes/                       # safe-html, relative-time, reading-time, truncate
├── app.config.ts                    # provideFirebaseApp / provideAuth / provideFirestore / provideStorage
└── app.routes.ts
```

### 5.2 Routing Map

| Route | Guard(s) | Notes |
| :--- | :--- | :--- |
| `/home` | — | feed, featured strip, sorts, search, pagination |
| `/discover` | — | categories, popular tags, readers' choice, rising authors |
| `/articles/:id` | — | detail + comments; self-guards drafts/scheduled/future |
| `/editor`, `/editor/:id` | authGuard, ownerGuard | create / edit (drafts editable) |
| `/editor/preview` | authGuard | draft hand-off from EditorDraftService |
| `/my-posts` | authGuard | drafts / scheduled / published tabs |
| `/authors`, `/authors/:id` | — | directory; profile + published articles |
| `/login`, `/profile` | — / authGuard | social sign-in; profile edit |
| `**` | — | NotFound page |

### 5.3 State Management Strategy

- **Signal stores** (`auth.store`, `feed.store`) hold cross-cutting state; features use local `signal`/`computed` — demonstrating deliberate state management (spec §7).
- Firestore realtime observables bridge via `toSignal` — live comment counts and feed updates without manual refresh.
- **Auth:** `auth.service` maps the AngularFireAuth user → `users/{uid}` doc (auto-provisioning `role: 'reader'` on first sign-in) → exposes `user`, `profile`, `role` signals; navbar reacts instantly.
- **Feed:** one `PagedArticles` result per query with `startAfter(publishAt)` cursor pagination; the store exposes `loading`, `hasMore`, `page`, `sort`, `filters` signals consumed by home components.
- **Editor draft:** `EditorDraftService` (signal store) holds the in-progress article for the preview step and the edit round-trip.
- Lazy feature routes + indexed queries keep the bundle and read costs lean.

---

## 6. Non-Functional Requirements — Technical Approach

| Spec § | Requirement | Implementation approach |
| :--- | :--- | :--- |
| 6.1 Performance | Efficient loading, smooth pagination/search | Cursor pagination, composite indexes, debounced search, web-worker indexing, `OnPush` change detection with signals, lazy-loaded feature routes, `NgOptimizedImage` for covers, bundle budgets in `angular.json` |
| 6.2 Usability | Intuitive, responsive, modern | Mobile-first SCSS + Tailwind; skeleton loaders; empty/error states; keyboard focus states; `prefers-color-scheme`-aware dark mode (bonus) |
| 6.3 Security | Secure auth/session, protected actions | Firebase Auth session persistence; Firestore/Storage security rules as the only authorization authority; DOMPurify sanitization; private actions (drafts, editing) guarded client-side **and** rules-side |
| 6.4 Maintainability | Clear Angular architecture, modular | `core`/`features`/`shared` layout; standalone components; typed models; single-responsibility services; ESLint + Prettier |
| 6.5 Testability | ≥ 1 major component + ≥ 1 service tested; graceful failure | Jasmine/Karma suites for `ArticleService` (query + counter logic) and `CreateEditArticleComponent` (form validation & publish flow); global error handler; toasts on failures; retry-safe writes |

---

## 7. Seed / Demo Data (dev & reviewers)

- `seed.service.ts` (dev-mode only, runs once per browser profile with a confirmation dialog) creates:
  - demo accounts: `author@demo.com` / `Author@123!` (role author), `editor@demo.com` / `Editor@123!` (role editor); readers use Google/Facebook sign-in.
  - 2–3 demo authors with avatars + bios, ≥ 10 published articles across categories (2 featured, mixed tags, stock images), one scheduled article (`publishAt = now + 2 days`), one draft, and a threaded comment tree (root + nested replies).
  - `tags/{tag}` docs with `articleCount` and correct `users.publishedCount` values.
- Idempotent: marks seeded artifacts (e.g., a `seeded` flag doc) and skips when present.

> The demo credentials exist because social-only auth leaves reviewers no test path without their own Google/Facebook accounts; production builds can disable email/password providers entirely.

---

## 8. Requirements Traceability & Bonus Features

| Requirement (spec §) | Covered by |
| :--- | :--- |
| 5.1 Social auth (Auth0/Firebase) | Firebase Auth Google + Facebook; `auth.service` (§5.3) |
| 5.2 Home page: cards, pagination, sorts, search, featured | `/home` + `article.service` queries (§2.3, §4.3) |
| 5.3 Author directory, cards, search, profiles | `/authors`, `/authors/:id` + `author.service` |
| 5.4 Detail page: body, author bio, other articles, related | `/articles/:id` + related-by-tags query |
| 5.5 Comments: threaded, sorts, likes | `comment.service` + `comment-thread` component (§4.5) |
| 5.6 Rich editor: formatting, media, drafts, scheduling | `/editor` (Quill) + `my-posts` + publish/schedule flow (§4.1) |
| 5.7 Tags: add, browse, popular | `tag.service` + `/discover` tag cloud |
| 7 Web worker | `search-index.worker.ts` (§4.3) |
| 8 Deliverables | App + tests + GitHub repo + Firebase Hosting + README |

**Bonus features implemented** (spec §10): author follow (`following` subcollection + followerCount), article bookmarking (`bookmarks`), likes/reactions (articles + comments), trending topics (tag counters), dark mode. *Recommended reading* = related-by-tags on the detail page; *author analytics* is **out of scope** unless time permits (documented decision).