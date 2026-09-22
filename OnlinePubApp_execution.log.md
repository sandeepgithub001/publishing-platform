# OnlinePubApp — Execution Log

**Purpose:** Continuation log. If a session runs out of context/tokens, resume development from this file — it records every task, command, file created, verification result, and any exceptions with their resolutions.

- **Project root:** `c:\work\Angular basics\online-pub` (code) · this log lives in `c:\work\Angular basics\online pub spec-assets\`
- **Source docs:** `Online_Publishing_Platform_Technical_Specification.md` (contract), `Online_Publishing_Platform_Implementation_Plan.md` (phases), `Online_Publishing_Platform_Tasks.md` (23 tasks T1.1–T7.3) — all in the spec-assets folder
- **Firebase project:** `onlinepublishing-d632d` (Spark free tier). Web config captured in `env-templates/environment.development.ts` (spec-assets folder). `measurementId`/Analytics intentionally omitted.
- **Conventions:** Angular standalone + signals; editor tool writes files in ≤ ~6k-char chunks; long docs are written as ordered part-files then concatenated.

---

## Status Snapshot (updated as work proceeds)

| Task | Title | Status | Notes |
| :--- | :--- | :--- | :--- |
| T1.1 | Repo & Angular workspace scaffolding | ✅ Done | `online-pub/pubhub-client` (Angular 22.1), SCSS tokens, build green |
| T1.2 | Firebase project & auth providers | 🔶 Partial | Project + web app + config in env files done. **User action pending:** enable Google + Email/Password providers, confirm Firestore + Storage created in console |
| T1.3 | Security rules & indexes | ✅ Authored (deploy pending) | `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc` at repo root; deploy needs `firebase login` |
| T2.1 | Domain models & category config | ✅ Done | models + `categories.ts` (8 categories, tag normalization) |
| T2.2 | AngularFire providers & environments | ✅ Done (re-shaped) | Direct Firebase SDK `fb()` singleton instead of AngularFire (see EXCEPTION #1) |
| T2.3 | AuthService + profiles + role signals | ✅ Done | Google/Facebook/demo login, users/{uid} auto-provision, nameLower backfill |
| T2.4 | Seed service & demo accounts | ✅ Code done (run pending) | Idempotent, rule-compliant; needs emulator/console run |
| T3.1 | Routing, titles & guards | ✅ Done | 13 lazy routes; authGuard + ownerGuard |
| T3.2 | App shell: navbar, footer, toasts | ✅ Done | incl. live worker-backed search in navbar |
| T3.3 | Login UI & profile page | ✅ Done | social + demo + dev seed buttons; avatar upload |
| T4.1 | Home feed (featured, sorts, pagination) | ✅ Done | featured strip, 3 sorts, category chips, cursor pagination, skeletons |
| T4.2 | Global search + search worker | ✅ Done | pure `SearchIndex` core + worker entry + facade |
| T4.3 | Discover page | ✅ Done | tag cloud, readers' choice, rising authors |
| T4.4 | Author directory & profiles | ✅ Done | name search, profile + published list, follow |
| T4.5 | Article detail page | ✅ Done | sanitized render, related, more-from-author, access states, like/bookmark |
| T5.1 | Editor (Quill, media, autosave) | ✅ Done | restricted toolbar, cover upload w/ progress, 2.5 s autosave, beforeunload guard |
| T5.2 | Publish / schedule / unschedule | ✅ Done | datetime picker, batch counters (tags + publishedCount) |
| T5.3 | Preview step & My Posts | ✅ Done | `/editor/preview` + buckets (drafts/scheduled/published) w/ actions |
| T6.1 | Comment thread | ✅ Done | one fetch → client tree, depth cap 5, 3 sorts, likes, cascade delete |
| T6.2 | Engagement bonus set | ✅ Done | article likes, bookmarks, author follow |
| T7.1 | Unit tests | ✅ Done | **40 tests / 7 files, all passing (Vitest)** |
| T7.2 | UX & a11y polish pass | 🔶 Partial | skeletons/empty/error states, responsive, dark mode auto; manual multi-width pass outstanding |
| T7.3 | Deploy + README | 🔶 Partial | README written; deploy blocked on `firebase login` (interactive, user action) |

## Environment

| Check | Result |
| :--- | :--- |
| Node version | v24.20.0 |
| npm version | 12.0.2 |
| Target dir | `c:\work\Angular basics\online-pub` (created; `pubhub-client` workspace inside) |
| Build | `npm run build` ✅ green — 926 kB raw / 244 kB transfer initial |
| Tests | `npx ng test --watch=false` ✅ **40 passed / 7 files** |
| Dev server smoke | `ng serve --port 4310` → HTTP 200, `<app-root>` present |
| Firebase CLI | installed via npx, **not authenticated** (`firebase login` required before deploy) |

---

## T1.1 — Repository & Angular Workspace Scaffolding

**Plan ref:** Plan §1.1 · Steps:
1. Verify Node/npm
2. Create project root `c:\work\Angular basics\online-pub` with `.gitignore`
3. `ng new pubhub-client --routing --style=scss --standalone` in `/frontend`
4. Install deps: `firebase @angular/fire ngx-quill quill dompurify`
5. Folder skeleton `core/ features/ shared/`; global SCSS tokens
6. Verify `ng build`

- **2026-09-22 06:50** — Environment verified: **Node v24.20.0, npm 12.0.2**. Target dir `c:\work\Angular basics\online-pub` did not exist.
- **2026-09-22 06:52** — Created project root + root `.gitignore`. Scaffolded `npx @angular/cli@latest new pubhub-client --routing --style=scss --standalone --skip-git --skip-tests --defaults`. ✅ Packages installed.
- **DEVIATION (documented):** workspace is at `online-pub\pubhub-client` (CLI created it in root, not `/frontend/pubhub-client`); `--skip-tests` used (Karma specs to be added in T7.1). No `zone.js` in deps — Angular 22 is zoneless/signals-first, which suits the signal-store design.
- **2026-09-22 06:53** — ⚠️ EXCEPTION #1: `npm i firebase @angular/fire ...` failed (ERESOLVE): AngularFire latest = **20.0.3**, peer `@angular/* ^20.0.0`; workspace is **Angular 22.1.7**. No v22 AngularFire exists.
  **RESOLUTION:** use the **Firebase JS SDK (v12.19) directly** behind thin Angular services (`core/firebase.ts` singleton `fb()` provides auth/db/storage + emulator connect). AngularFire dropped from deps. Functionally equivalent; spec §1.1 stack table amended in log (not in spec file — spec change pending).
  - Side effect: earlier failed `npm i -D @types/dompurify` accidentally ran in spec-assets → cleaned (`node_modules`, `package.json`, `package-lock.json` removed from spec-assets).
- **2026-09-22 06:55** — `npm i firebase ngx-quill quill dompurify` ✅ → deps: firebase ^12.19.0, ngx-quill ^31.0.1, quill ^2.0.3, dompurify ^3.4.15 (+ @types/dompurify in devDeps earlier attempt — re-verify at T7.1; dompurify v3 ships its own types, @types not needed).
- **2026-09-22 06:59** — Baseline `npm run build` ✅ green: 217.21 kB raw / 59.62 kB transfer initial.
- **2026-09-22 07:0x** — Created (T2.1 partial + T2.2 core): `src/environments/environment.ts` + `environment.development.ts` (real config, `useEmulators: true` in dev), `angular.json` development `fileReplacements`, `core/firebase.ts` (`fb()` singleton + emulator wiring), `core/config/categories.ts` (8-category catalog + `normalizeTag`/`normalizeTags`), models: `user.model.ts`, `article.model.ts`, `comment.model.ts`, `tag.model.ts` — all per spec §2.2.

### T1.1–T2.4 progress (07:00–07:35)

- **Workspace state:** `c:\work\Angular basics\online-pub\pubhub-client` — Angular 22.1 standalone, SCSS, zoneless. Build ✅ green (worker chunk emitted: `worker-*.js | search-index-worker`).
- **Files created (core):**
  - `src/environments/environment.ts` + `environment.development.ts` (real config; dev = `useEmulators: true`); `angular.json` development `fileReplacements` wired
  - `core/firebase.ts` — `fb()` singleton (auth/db/storage + emulator connect)
  - `core/config/categories.ts` — 8-category catalog, `normalizeTag(s)`
  - `core/models/` — `user.model.ts` (`AppUser`, `emptyAppUser`), `article.model.ts` (`Article` incl. `slug`, `ArticleCard`, `PagedArticles`, `HomeFilters`), `comment.model.ts` (`CommentDoc`, `CommentNode`, `CommentSort`), `tag.model.ts`
  - `core/util/text.ts` — `sanitizeHtml` (DOMPurify allow-list + iframe host allow-list), `stripHtml`, `deriveExcerpt`, `readingMinutes`, `slugify`
  - `core/services/` — `auth.service.ts` (signals: ready/user/currentProfile/role/isAuthor/isEditor; Google+Facebook+demo login; auto-provision users/{uid}; nameLower backfill; updateProfile), `article.mapper.ts`, `article.service.ts` (getFeed w/ sort+category+tag+cursor pagination; getArticle; getFeatured; getRelated; getByAuthor; getMyArticles; createDraft; saveDraft; publish/unpublish w/ single-count counter bumps; deleteDraft; bumpView (sessionStorage-guarded); toggleLike w/ likedBy cap; toggleFeatured; adjustCommentCount), `comment.service.ts` (thread fetch → client tree w/ depth≤5; add w/ counter batch; toggleLike w/ cap; remove w/ descendants batch; buildTree/sortNodes/flattenTree/collectDescendants helpers), `author.service.ts` (directory w/ name prefix range + publishedCount>0; profile; follow/unfollow; bookmark toggle/get), `tag.service.ts` (bumpTags set(merge)+increment; popular tags), `storage.service.ts` (cover/inline/avatar uploads w/ validation + progress), `seed-data.types.ts`, `seed-authors-1.ts`, `seed-authors-2.ts`, `seed.service.ts` (rule-compliant seeder: authors sign in to write own content; comments written by article author; meta/seed marker; `ensureFeaturedApplied()` post-console-promotion step; seed articles carry `slug`), `search.service.ts` (worker facade w/ requestId + timeout)
  - `core/stores/` — `feed.store.ts` (signals + seq-guarded cursor pagination), `editor-draft.service.ts`
  - `core/guards/` — `auth.guard.ts` (waitForAuthReady + returnUrl), `owner.guard.ts`
  - `core/workers/search-index.worker.ts` — inverted index + scoring (title>tags>text), upsert/clear/search protocol
  - `shared/pipes/` — `safe-html.pipe.ts`, `relative-time.pipe.ts`, `reading-time.pipe.ts`
- **EXCEPTIONS fixed:** missing `setDoc`/`emulatorPorts` typing; article.service double-insert miscount (orphaned `getFeatured` after class close — moved inside); comment.service bad indirections removed; author.service bogus `require-firestore` helpers replaced with direct `startAt`/`endAt` imports; `slug` added to model/mapper/draft/publish flow; safe-html pipe import path fixed.
- **Seed design note (IMPORTANT):** editor@demo.com is seeded with role `author` (rules forbid self-promotion). After running the seeder: (1) Firestore console → `users/{morganUid}` → set `role: "editor"`; (2) click "Apply editor picks" (calls `ensureFeaturedApplied()` — flips 2 `isFeatured` flags and sets `meta/seed.featuredApplied`). Demo accounts: author@demo.com/Author@123!, marcus@demo.com/Marcus@123!, priya@demo.com/Priya@123!, editor@demo.com/Editor@123!.
### Phase 3–7 implementation (07:35–08:55)

- **App shell (T3.x):** `app.config.ts` (router + `withComponentInputBinding` + global ErrorHandler→toast), `app.routes.ts` (13 lazy routes w/ titles), `styles.scss` (SCSS design tokens, dark-mode via `prefers-color-scheme`, btn/card/chip/input/skeleton utilities), `ToastService` + `ToastContainerComponent`, `NavbarComponent` (auth+role-aware, live worker-backed search dropdown, avatar menu), `FooterComponent`, `ArticleCardComponent` (cover w/ gradient fallback, featured badge, 3-tag cap, reading time). `app.html` deleted (inline template in `app.ts`).
- **Auth (T3.3):** `login.component.ts` (Google/Facebook popups, demo email+password, friendly error mapping, `returnUrl`, dev-only **Run seeder** / **Apply editor picks** buttons), `profile.component.ts` (displayName/bio≤500 + avatar upload), `not-found.component.ts`.
- **Reader (T4.x):** `home.component.ts` (featured strip, sort tabs, category chips reflecting to URL, cursor "Load more", skeletons/empty, pushes pages into the search worker), `discover.component.ts` (popular tags, readers' choice, rising authors), `author-directory.component.ts` (debounced name search + paging), `author-profile.component.ts` (bio/stats/follow + published list), `article-detail.component.ts` (5-state machine: loading/ready/not-found/restricted/scheduled; sanitized body; author card; like/bookmark; related + more-from-author; sets document title).
- **Comments (T6.1):** `comment-thread.component.ts` (one fetch → tree, sorts, composer, optimistic add) + self-recursive `comment-node.component.ts` (indent, like/reply/delete with ownership+editor checks).
- **Authoring (T5.x):** `editor.component.ts` (Quill via `ngx-quill` w/ restricted toolbar, title/category/tags w/ suggestions, cover upload w/ progress, 2.5 s debounced autosave, beforeunload guard, save/preview/publish-now/schedule/unschedule/delete), `preview.component.ts` (`DRAFT PREVIEW` banner, 1:1 render, publish), `my-posts.component.ts` (drafts/scheduled/published buckets with counts, per-row actions).
- **Infra (T1.3):** repo-root `firestore.rules` (spec §3.2 + `meta` collection for the seed marker), `storage.rules` (§4.6), `firestore.indexes.json` (10 composite indexes incl. `isFeatured` + `authorId/createdAt` + `slug`-free), `firebase.json` (hosting public `pubhub-client/dist/pubhub-client/browser`, SPA rewrite, emulators), `.firebaserc` (project `onlinepublishing-d632d`).
- **Testability refactor (T7.1):** extracted pure logic → `core/services/article.query.ts` (`buildFeedPlan`, `popularityScore`, `hasMoreAfter`) and `core/workers/search-index.core.ts` (`SearchIndex`, `tokenize`, `queryTokens`, worker protocol types); worker entry is now a thin shell.
- **Tests:** Vitest via `@angular/build:unit-test` (Angular 22 native runner; `vitest`+`jsdom` installed, test target added to `angular.json`). Specs: `article.query.spec.ts` (6), `search-index.core.spec.ts` (7), `comment.service.spec.ts` (5), `text.spec.ts` (8), `auth.guard.spec.ts` (3), `article-card.component.spec.ts` (5), `comment-node.component.spec.ts` (6) → **40 tests / 7 files, all green**.
  - **Bugs found & fixed by the new tests:** (1) tag/query tokenization mismatch (tags indexed as `web-workers` but query tokenized to `web`+`workers`) → added `queryTokens()` canonical form + tag token expansion; (2) field-scoped search leaked matches from other fields → added `scopedTokens.includes(token)` guard; (3) float artifact in reply indentation (`3.3000000000000003rem`) → rounded.
- **Verifications:** `npm run build` ✅ green (926 kB raw / 244 kB transfer; worker chunk `worker-*.js | search-index-worker`); `ng serve --port 4310` smoke → HTTP 200 with `<app-root>`; `ng test --watch=false` ✅ 40/40.
- **README.md** written at repo root (architecture, demo credentials, run/test/deploy commands, deviations table, bonus list).

### ⛔ Open items / next actions (for continuation)

1. **Firebase console (user):** enable Auth providers Google + Email/Password; confirm Firestore + Storage databases exist (region chosen). Facebook provider optional/deferred.
2. **Seed:** open `/login` → **Run seeder** (or run against emulators). Then console-promote `editor@demo.com` user doc `role → "editor"` and click **Apply editor picks**.
3. **Deploy:** `firebase login` (interactive) then `npx firebase-tools deploy --only hosting,firestore:rules,firestore:indexes,storage`. Expected URL: `https://onlinepublishing-d632d.web.app`.
4. **T7.2 leftovers:** manual responsive/a11y pass at 375/768/1280 px (skeletons + empty states already in place).
5. **Optional hardening:** move tag/counter maintenance to Cloud Functions (needs Blaze); add Algolia/Typesense for exhaustive search.

### Repository state (2026-09-22, final)

- `git init` + initial commit **`f69eca9`** on `master` — 84 tracked files; verified **no `node_modules`, no `dist/`, no log files** committed.
- Push pending: `git remote add origin <your-github-url> && git push -u origin master` (README has the placeholder for the URL).
- Deploy pending: `firebase login` → `npx firebase-tools deploy --only hosting,firestore:rules,firestore:indexes,storage`; all config is committed and ready. Expected URL: `https://onlinepublishing-d632d.web.app`.
- Everything else in the plan is code-complete and verified (build ✅, 40/40 tests ✅, serve smoke ✅).

---

## Continuation checkpoint (2026-09-22)

User-reported verification milestone for seeding (recorded for continuation):

- Dry-run executed by user: `node tools/seed.mjs --status` → ✅ **no error, exit 0** (silent success). This is the expected behavior for validation-only mode — it does *not* prompt for login (no writes).
- To proceed with the **live seed**, run the non-dry-run command: `node tools/seed.mjs` (from `c:\work\Angular basics\online-pub\pubhub-client` or `c:\work\Angular basics\online-pub`). This version **will** prompt for `firebase login:ci` terminal-token paste, because it writes to live Firestore.
- Post-seed: the editor-role promotion + editorial picks application is handled by the same script (flag `--promote-editor`) or via the documented 3-line console query in this log.




