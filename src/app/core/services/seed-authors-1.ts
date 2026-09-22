import { SeedAuthorDef } from './seed-data.types';

/** Seed authors part 1: Ava (author@demo.com) + Marcus. */
export const SEED_AUTHORS_PART1: SeedAuthorDef[] = [
  {
    key: 'ava',
    email: 'author@demo.com',
    password: 'Author@123!',
    displayName: 'Ava Chen',
    role: 'author',
    bio: 'Product engineer writing about the craft of building for the web.',
    articles: [
      {
        slug: 'signals-change-how-we-build',
        title: 'Signals Change How We Build Angular Apps',
        category: 'Technology',
        tags: ['angular', 'signals', 'frontend'],
        featured: true,
        daysAgo: 1,
        paragraphs: [
          'Fine-grained reactivity has quietly become the default mental model for modern frontend frameworks. In Angular, signals let the framework track exactly which parts of the UI depend on which pieces of state.',
          'The practical win is not just performance — it is clarity. A component reads state, the framework schedules the smallest possible update, and nobody debugs a change-detection cycle again.',
          'Start small: convert a BehaviorSubject to a signal store, keep the public API readonly, and expose intent-revealing actions instead of raw setters.',
        ],
      },
      {
        slug: 'designing-reading-experiences',
        title: 'Designing Reading Experiences People Finish',
        category: 'Design',
        tags: ['ux', 'typography', 'reading'],
        daysAgo: 3,
        paragraphs: [
          'A great reading experience is mostly subtraction: fewer chrome elements, a measure around 65 characters, and typography that gets out of the way.',
          'Motion should carry meaning. A skeleton shimmer says "content is coming"; a jarring layout shift says nobody measured anything.',
        ],
      },
      {
        slug: 'shipping-side-projects',
        title: 'Shipping Side Projects Without Burning Out',
        category: 'Opinion',
        tags: ['productivity', 'side-projects'],
        featured: true,
        daysAgo: 5,
        paragraphs: [
          'The graveyard of side projects is full of beautiful architecture and no users. Scope is a feature: pick one flow, make it delightful, ship it.',
          'Write the README before the code. If you cannot describe the product in three sentences, the code will not clarify it.',
        ],
      },
      {
        slug: 'web-workers-in-practice',
        title: 'Web Workers in Practice: When the Main Thread Complains',
        category: 'Tutorials',
        tags: ['performance', 'web-workers', 'javascript'],
        daysAgo: 8,
        paragraphs: [
          'If your typeahead stutters while indexing a few thousand rows, you have met the main-thread ceiling. Workers move that work to a background lane.',
          'The contract matters more than the code: small typed messages, versioned, and the worker stays free of framework imports so it remains testable.',
        ],
      },
    ],
  },
  {
    key: 'marcus',
    email: 'marcus@demo.com',
    password: 'Marcus@123!',
    displayName: 'Marcus Reid',
    role: 'author',
    bio: 'Data journalist. Turns spreadsheets into stories and arguments into charts.',
    articles: [
      {
        slug: 'remote-work-geography',
        title: 'The Quiet Geography of Remote Work',
        category: 'Business',
        tags: ['remote-work', 'economy', 'cities'],
        daysAgo: 2,
        paragraphs: [
          'Remote work did not kill the city; it redistributed its calendar. Downtowns are quiet on Tuesdays and busy on Thursdays, and coffee shops learned to price accordingly.',
          'The interesting data is in migration flows between mid-sized metros, not in the headline narratives about hollowed-out megacities.',
        ],
      },
      {
        slug: 'climate-data-literacy',
        title: 'Climate Numbers, Read Carefully',
        category: 'Science',
        tags: ['climate', 'data', 'science'],
        daysAgo: 4,
        paragraphs: [
          'Averages hide tails. When a headline says the ocean warmed by a fraction of a degree, the energy involved could power civilizations — context is the whole story.',
          'Three habits make anyone a better reader of climate data: check the baseline, check the uncertainty, and ask what the error bars are doing.',
        ],
      },
      {
        slug: 'charts-that-lie',
        title: 'Charts That Lie (Politely)',
        category: 'Design',
        tags: ['data-viz', 'charts', 'ethics'],
        daysAgo: 9,
        paragraphs: ['Truncated axes, dual axes, and cherry-picked windows are the polite liars of business reporting. The fix is editorial, not technical.'],
      },
      {
        slug: 'interviewing-data-people',
        title: 'How to Interview Data People',
        category: 'Business',
        tags: ['hiring', 'management'],
        daysAgo: 14,
        paragraphs: ['Skip the whiteboard puzzles. Give candidates a messy dataset and a vague stakeholder question — the job is translation, and translation deserves an audition.'],
      },
    ],
  },
];
