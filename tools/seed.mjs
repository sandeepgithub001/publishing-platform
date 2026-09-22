#!/usr/bin/env node
/**
 * PubHub demo-content seeder — Node + Firebase **client** SDK (same security
 * rules as the browser app: every author signs in and writes their OWN docs).
 *
 * Usage (run from pubhub-client/):
 *   node tools/seed.mjs                 # seed the real project (onlinepublishing-d632d)
 *   node tools/seed.mjs --emulator      # seed against the local emulator suite
 *   node tools/seed.mjs --feature       # after console promotion: apply editor's picks
 *   node tools/seed.mjs --status        # report what currently exists (no writes)
 *
 * Data mirrors src/app/core/services/seed-*.ts — keep both in sync.
 */
import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  getAuth,
} from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const args = process.argv.slice(2);
const USE_EMULATORS = args.includes('--emulator');
const APPLY_FEATURED = args.includes('--feature');
const STATUS_ONLY = args.includes('--status');

function readFirebaseConfigFromEnvironment() {
  const envPath = path.resolve(process.cwd(), 'src/environments/environment.ts');
  const text = fs.readFileSync(envPath, 'utf8');

  const apiKey = text.match(/apiKey:\s*["']([^"']+)["']/)?.[1];
  const authDomain = text.match(/authDomain:\s*["']([^"']+)["']/)?.[1];
  const databaseURL = text.match(/databaseURL:\s*["']([^"']+)["']/)?.[1];
  const projectId = text.match(/projectId:\s*["']([^"']+)["']/)?.[1];
  const storageBucket = text.match(/storageBucket:\s*["']([^"']+)["']/)?.[1];
  const messagingSenderId = text.match(/messagingSenderId:\s*["']([^"']+)["']/)?.[1];
  const appId = text.match(/appId:\s*["']([^"']+)["']/)?.[1];
  const measurementId = text.match(/measurementId:\s*["']([^"']+)["']/)?.[1];

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    throw new Error(`Could not parse Firebase config from ${envPath}`);
  }

  return {
    apiKey,
    authDomain,
    databaseURL,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    ...(measurementId ? { measurementId } : {}),
  };
}

const firebaseConfig = readFirebaseConfigFromEnvironment();

const FEATURED_SLUGS = ['signals-change-how-we-build', 'shipping-side-projects'];
const DAY = 86_400_000;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
if (USE_EMULATORS) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  console.log('→ connected to LOCAL EMULATORS (auth :9099, firestore :8080)');
}

const log = (...m) => console.log(...m);
const tagify = (t) => t.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
const cover = (i) => `https://picsum.photos/seed/pubhub-${i}/800/450`;
const avatar = (k) => `https://i.pravatar.cc/150?u=${k}`;
const html = (ps) => ps.map((p) => `<p>${p}</p>`).join('');

/** Compact mirror of src/app/core/services/seed-authors-*.ts */
const AUTHORS = [
  {
    key: 'ava',
    email: 'author@demo.com',
    password: 'Author@123!',
    displayName: 'Ava Chen',
    role: 'author',
    bio: 'Product engineer writing about the craft of building for the web.',
    articles: [
      { slug: 'signals-change-how-we-build', title: 'Signals Change How We Build Angular Apps', category: 'Technology', tags: ['angular', 'signals', 'frontend'], featured: true, daysAgo: 1, paragraphs: ['Fine-grained reactivity has quietly become the default mental model for modern frontend frameworks. In Angular, signals let the framework track exactly which parts of the UI depend on which pieces of state.', 'The practical win is not just performance — it is clarity. Start small: convert a BehaviorSubject to a signal store, keep the public API readonly, and expose intent-revealing actions.'] },
      { slug: 'designing-reading-experiences', title: 'Designing Reading Experiences People Finish', category: 'Design', tags: ['ux', 'typography', 'reading'], daysAgo: 3, paragraphs: ['A great reading experience is mostly subtraction: fewer chrome elements, a measure around 65 characters, and typography that gets out of the way.', 'Motion should carry meaning. A skeleton shimmer says "content is coming"; a jarring layout shift says nobody measured anything.'] },
      { slug: 'shipping-side-projects', title: 'Shipping Side Projects Without Burning Out', category: 'Opinion', tags: ['productivity', 'side-projects'], featured: true, daysAgo: 5, paragraphs: ['The graveyard of side projects is full of beautiful architecture and no users. Scope is a feature: pick one flow, make it delightful, ship it.', 'Write the README before the code. If you cannot describe the product in three sentences, the code will not clarify it.'] },
      { slug: 'web-workers-in-practice', title: 'Web Workers in Practice: When the Main Thread Complains', category: 'Tutorials', tags: ['performance', 'web-workers', 'javascript'], daysAgo: 8, paragraphs: ['If your typeahead stutters while indexing a few thousand rows, you have met the main-thread ceiling. Workers move that work to a background lane.', 'The contract matters more than the code: small typed messages, versioned, and the worker stays free of framework imports so it remains testable.'] },
    ],
  },
];

AUTHORS.push(
  {
    key: 'marcus',
    email: 'marcus@demo.com',
    password: 'Marcus@123!',
    displayName: 'Marcus Reid',
    role: 'author',
    bio: 'Data journalist. Turns spreadsheets into stories and arguments into charts.',
    articles: [
      { slug: 'remote-work-geography', title: 'The Quiet Geography of Remote Work', category: 'Business', tags: ['remote-work', 'economy', 'cities'], daysAgo: 2, paragraphs: ['Remote work did not kill the city; it redistributed its calendar. Downtowns are quiet on Tuesdays and busy on Thursdays.', 'The interesting data is in migration flows between mid-sized metros, not in the headline narratives about hollowed-out megacities.'] },
      { slug: 'climate-data-literacy', title: 'Climate Numbers, Read Carefully', category: 'Science', tags: ['climate', 'data', 'science'], daysAgo: 4, paragraphs: ['Averages hide tails. When a headline says the ocean warmed by a fraction of a degree, the energy involved could power civilizations.', 'Three habits make anyone a better reader of climate data: check the baseline, check the uncertainty, and ask what the error bars are doing.'] },
      { slug: 'charts-that-lie', title: 'Charts That Lie (Politely)', category: 'Design', tags: ['data-viz', 'charts', 'ethics'], daysAgo: 9, paragraphs: ['Truncated axes, dual axes, and cherry-picked windows are the polite liars of business reporting. The fix is editorial, not technical.'] },
      { slug: 'interviewing-data-people', title: 'How to Interview Data People', category: 'Business', tags: ['hiring', 'management'], daysAgo: 14, paragraphs: ['Skip the whiteboard puzzles. Give candidates a messy dataset and a vague stakeholder question — the job is translation, and translation deserves an audition.'] },
    ],
  },
  {
    key: 'priya',
    email: 'priya@demo.com',
    password: 'Priya@123!',
    displayName: 'Priya Nair',
    role: 'author',
    bio: 'Travel writer and reluctant photographer. Mapping street food by transit line.',
    articles: [
      { slug: 'walking-kochi', title: 'Walking Kochi: Forts, Ferries, and Filter Coffee', category: 'Travel', tags: ['india', 'kerala', 'walking-tours'], daysAgo: 6, paragraphs: ['Kochi rewards the walker: Chinese fishing nets at sunrise, a ferry ride that costs less than a coffee, and spice warehouses turned galleries.', 'The best route is no route — follow the smell of roasting cashews and you will end up somewhere worth photographing.'] },
      { slug: 'packing-for-two-weeks', title: 'Packing for Two Weeks in One Backpack', category: 'Travel', tags: ['packing', 'minimalism'], daysAgo: 12, paragraphs: ['The rule is brutal and liberating: lay everything out, remove half, then remove one more shirt than feels reasonable.'] },
      { slug: 'slow-travel-manifesto', title: 'A Slow Travel Manifesto', category: 'Culture', tags: ['slow-travel', 'manifesto'], scheduledDaysFromNow: 2, daysAgo: 0, paragraphs: ["Stay a week. Learn the baker's schedule. Measure a place by its regulars, not its landmarks."] },
      { slug: 'draft-kerala-itinerary', title: 'Draft: A Kerala Itinerary That Breathes', category: 'Travel', tags: ['kerala', 'itineraries'], draft: true, daysAgo: 0, paragraphs: ['Rough notes: backwaters by public ferry, not houseboat; Munnar only if the weather is kind.'] },
    ],
  },
  {
    key: 'morgan',
    email: 'editor@demo.com',
    password: 'Editor@123!',
    displayName: 'Morgan Lee',
    role: 'editor',
    bio: 'Editorial lead. Keeps the front page honest and the tags tidy.',
    articles: [],
  },
);

const COMMENTS = [
  { slug: 'signals-change-how-we-build', authorKey: 'ava', message: 'What did the migration look like for forms? Template-driven forms still lean on zones in our codebase.' },
  { slug: 'signals-change-how-we-build', authorKey: 'ava', message: 'We migrated form state field by field; the forms themselves can stay until the team is ready.', replyTo: true },
  { slug: 'designing-reading-experiences', authorKey: 'ava', message: 'The 65-character measure tip alone fixed our mobile bounce rate.' },
  { slug: 'remote-work-geography', authorKey: 'marcus', message: 'Sources for the Tuesday/Thursday pattern are linked at the end of the piece.' },
  { slug: 'climate-data-literacy', authorKey: 'marcus', message: 'Adding a follow-up on uncertainty bands next month.', replyTo: true },
];

const readingMinutes = (paragraphs) => {
  const words = paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};
const excerptOf = (paragraphs) => {
  const text = paragraphs.join(' ');
  return text.length <= 300 ? text : text.slice(0, 297).trimEnd() + '…';
};

// ── Part 3a: tag normalization + auth + data writers ─────────────────
// Mirrors SeedService.ensureAuthUser / writeUserProfile / writeArticle

/** Full tag normalization (mirrors normalizeTag from core/config/categories.ts). */
const normalizeTag = (t) =>
  t.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-|-$/g, '');

const normalizeTags = (raw) => {
  const seen = new Set();
  const out = [];
  for (const tag of raw.map(normalizeTag).filter(Boolean)) {
    if (!seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
      if (out.length >= 5) break;
    }
  }
  return out;
};

/** Ensure the seed author exists in Firebase Auth. Signs in if already registered. */
async function ensureAuthUser(def) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, def.email, def.password);
    await updateProfile(cred.user, { displayName: def.displayName });
    return cred.user.uid;
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, def.email, def.password);
      return cred.user.uid;
    }
    throw e;
  }
}

/** Write users/{uid} profile. Editors are seeded as 'author' — promotion to
 *  editor is a manual Firestore console step (rules forbid self-promotion). */
async function writeUserProfile(uid, def) {
  const role = def.role === 'editor' ? 'author' : def.role;
  await setDoc(
    doc(db, 'users', uid),
    {
      displayName: def.displayName,
      email: def.email,
      photoURL: avatar(def.key),
      bio: def.bio,
      role,
      publishedCount: 0,
      followerCount: 0,
      nameLower: def.displayName.trim().toLowerCase(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Write a single article doc. Non-draft articles also bump the author's
 * publishedCount and tag counters (mirrors TagService.bumpTags + publish flow).
 */
async function writeArticle(uid, def, a, index) {
  const now = Date.now();
  let publishAt = null;
  if (!a.draft) {
    publishAt = a.scheduledDaysFromNow
      ? Timestamp.fromMillis(now + a.scheduledDaysFromNow * DAY)
      : Timestamp.fromMillis(now - a.daysAgo * DAY);
  }
  const ref = doc(collection(db, 'articles'));
  const tags = normalizeTags(a.tags);
  await setDoc(ref, {
    authorId: uid,
    slug: a.slug,
    authorName: def.displayName,
    authorPhoto: avatar(def.key),
    authorNameLower: def.displayName.trim().toLowerCase(),
    title: a.title,
    excerpt: excerptOf(a.paragraphs),
    contentHtml: html(a.paragraphs),
    coverImageUrl: cover(index),
    category: a.category,
    tags,
    status: a.draft ? 'draft' : 'published',
    isFeatured: false,
    publishAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    readingMinutes: readingMinutes(a.paragraphs),
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    popularityScore: 0,
    likedBy: [],
  });
  if (!a.draft) {
    const batch = writeBatch(db);
    for (const tag of tags) {
      batch.set(doc(db, 'tags', tag), { name: tag, articleCount: increment(1) }, { merge: true });
    }
    batch.update(doc(db, 'users', uid), { publishedCount: increment(1) });
    await batch.commit();
  }
  return ref.id;
}

// ── Part 3b: lookups + status + feature + run ─────────────────────────

/** Look up an article by slug (used by --feature and comment linking). */
async function findBySlug(slug) {
  const snap = await getDocs(query(collection(db, 'articles'), where('slug', '==', slug)));
  return snap.docs[0] ?? null;
}

/** --status: read-only report of what currently exists. */
async function statusReport() {
  const marker = await getDoc(doc(db, 'meta', 'seed'));
  const usersSnap = await getDocs(collection(db, 'users'));
  const articlesSnap = await getDocs(collection(db, 'articles'));
  const commentsSnap = await getDocs(collection(db, 'comments'));
  const tagsSnap = await getDocs(collection(db, 'tags'));

  log('\n── Seed status ──');
  log(`seed marker:  ${marker.exists() ? 'EXISTS' : 'not set'}`);
  log(`users:        ${usersSnap.size}`);
  log(`articles:     ${articlesSnap.size}`);
  log(`comments:     ${commentsSnap.size}`);
  log(`tags:         ${tagsSnap.size}`);
  if (marker.exists()) {
    const d = marker.data();
    log(`  version:    ${d.version ?? '?'}`);
    log(`  seeded at:  ${d.at ?? '?'}`);
    log(`  featured:   ${d.featuredApplied ? 'applied' : 'pending'}`);
  }
  log('─────────────────\n');
}

/** --feature: after you promote editor@demo.com → role="editor" in the
 *  Firestore console, this sets isFeatured=true on the editor's picks. */
async function applyFeatured() {
  await signInWithEmailAndPassword(auth, 'editor@demo.com', 'Editor@123!');
  const uid = auth.currentUser?.uid ?? '';
  const profile = await getDoc(doc(db, 'users', uid));
  if (profile.data()?.role !== 'editor') {
    await signOut(auth);
    log('editor@demo.com is not promoted yet. Set users/{uid}.role = "editor" in the Firestore console, then retry.');
    process.exit(1);
  }
  for (const slug of FEATURED_SLUGS) {
    const snap = await findBySlug(slug);
    if (snap && snap.data().isFeatured !== true) {
      await setDoc(snap.ref, { isFeatured: true }, { merge: true });
      log(`  featured: ${slug}`);
    }
  }
  await setDoc(doc(db, 'meta', 'seed'), { featuredApplied: true }, { merge: true });
  await signOut(auth);
  log('Editor picks applied (2 featured articles).');
}

/** Main seeding routine: authors → articles → comments → marker. */
async function run() {
  // Idempotency — skip if the seed marker already exists
  const marker = await getDoc(doc(db, 'meta', 'seed'));
  if (marker.exists()) {
    log('Seed data already present — skipped.');
    return;
  }
  log('Starting seed...\n');

  const byKey = new Map(); // authorKey → { def, uid }
  const articles = new Map(); // slug → { id, uid }
  const rootComments = new Map(); // slug → commentId (for thread replies)
  let index = 0;
  let draftCount = 0;
  let scheduledCount = 0;
  let publishedCount = 0;

  // 1. Create / sign in each author and write their own user profile + articles
  for (const def of AUTHORS) {
    const uid = await ensureAuthUser(def);
    byKey.set(def.key, { def, uid });
    await writeUserProfile(uid, def);
    log(`  ${def.displayName} signed in`);
    for (const a of def.articles) {
      const id = await writeArticle(uid, def, a, index++);
      articles.set(a.slug, { id, uid });
      if (a.draft) draftCount++;
      else if (a.scheduledDaysFromNow) scheduledCount++;
      else publishedCount++;
      log(`  · ${a.title}`);
    }
  }

  // 2. Write comments — each comment author signs in to satisfy rules
  //    (rules require comment.authorId == request.auth.uid)
  for (const c of COMMENTS) {
    const author = byKey.get(c.authorKey);
    const target = articles.get(c.slug);
    if (!author || !target) {
      log(`  ! skipped comment — no author/article for "${c.slug}" / "${c.authorKey}"`);
      continue;
    }
    await signInWithEmailAndPassword(auth, author.def.email, author.def.password);

    const parentCommentId = c.replyTo ? rootComments.get(c.slug) ?? null : null;
    const ref = doc(collection(db, 'comments'));
    const batch = writeBatch(db);
    batch.set(ref, {
      articleId: target.id,
      parentCommentId,
      authorId: author.uid,
      authorName: author.def.displayName,
      authorPhoto: avatar(c.authorKey),
      message: c.message,
      likeCount: 0,
      likedBy: [],
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'articles', target.id), {
      commentCount: increment(1),
      popularityScore: increment(2),
    });
    await batch.commit();

    if (!parentCommentId) rootComments.set(c.slug, ref.id);
    log(`  comment: "${c.message.slice(0, 50).trim()}…" on "${c.slug}" — ${author.def.displayName}`);
  }
  await signOut(auth);

  // 3. Write the seed marker (guards against re-seeding)
  await setDoc(doc(db, 'meta', 'seed'), {
    version: 1,
    at: serverTimestamp(),
    featuredApplied: false,
  });

  log(`\n  Seeded ${publishedCount} published (+${scheduledCount} scheduled, +${draftCount} draft) articles, ${COMMENTS.length} comments.`);
  log('NEXT: promote editor@demo.com to role="editor" in the Firestore console, then:');
  log('    node tools/seed.mjs --feature');
}

// ── entry point ──
const main = STATUS_ONLY ? statusReport() : APPLY_FEATURED ? applyFeatured() : run();
main.then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
