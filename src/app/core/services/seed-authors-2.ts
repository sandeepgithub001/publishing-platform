import { SeedAuthorDef, SeedCommentDef } from './seed-data.types';

/** Seed authors part 2: Priya (+ scheduled + draft) + Morgan (editor) + comments. */
export const SEED_AUTHORS_PART2: SeedAuthorDef[] = [
  {
    key: 'priya',
    email: 'priya@demo.com',
    password: 'Priya@123!',
    displayName: 'Priya Nair',
    role: 'author',
    bio: 'Travel writer and reluctant photographer. Mapping street food by transit line.',
    articles: [
      {
        slug: 'walking-kochi',
        title: 'Walking Kochi: Forts, Ferries, and Filter Coffee',
        category: 'Travel',
        tags: ['india', 'kerala', 'walking-tours'],
        daysAgo: 6,
        paragraphs: [
          'Kochi rewards the walker: Chinese fishing nets at sunrise, a ferry ride that costs less than a coffee, and spice warehouses turned galleries.',
          'The best route is no route — follow the smell of roasting cashews and you will end up somewhere worth photographing.',
        ],
      },
      {
        slug: 'packing-for-two-weeks',
        title: 'Packing for Two Weeks in One Backpack',
        category: 'Travel',
        tags: ['packing', 'minimalism'],
        daysAgo: 12,
        paragraphs: ['The rule is brutal and liberating: lay everything out, remove half, then remove one more shirt than feels reasonable.'],
      },
      {
        slug: 'slow-travel-manifesto',
        title: 'A Slow Travel Manifesto',
        category: 'Culture',
        tags: ['slow-travel', 'manifesto'],
        scheduledDaysFromNow: 2,
        daysAgo: 0,
        paragraphs: ['Stay a week. Learn the baker\'s schedule. Measure a place by its regulars, not its landmarks.'],
      },
      {
        slug: 'draft-kerala-itinerary',
        title: 'Draft: A Kerala Itinerary That Breathes',
        category: 'Travel',
        tags: ['kerala', 'itineraries'],
        draft: true,
        daysAgo: 0,
        paragraphs: ['Rough notes: backwaters by public ferry, not houseboat; Munnar only if the weather is kind.'],
      },
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
];

export const SEED_COMMENTS: SeedCommentDef[] = [
  { articleSlug: 'signals-change-how-we-build', authorKey: 'ava', message: 'What did the migration look like for forms? Template-driven forms still lean on zones in our codebase.' },
  { articleSlug: 'signals-change-how-we-build', authorKey: 'ava', message: 'We migrated form state field by field; the forms themselves can stay until the team is ready.', replyTo: 'ava' },
  { articleSlug: 'designing-reading-experiences', authorKey: 'ava', message: 'The 65-character measure tip alone fixed our mobile bounce rate.' },
  { articleSlug: 'remote-work-geography', authorKey: 'marcus', message: 'Sources for the Tuesday/Thursday pattern are linked at the end of the piece.' },
  { articleSlug: 'climate-data-literacy', authorKey: 'marcus', message: 'Adding a follow-up on uncertainty bands next month.', replyTo: 'marcus' },
];
