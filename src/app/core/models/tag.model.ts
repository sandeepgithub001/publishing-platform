import { Timestamp } from 'firebase/firestore';

/** tags/{tagName} document — spec §2.2. Doc id == normalized tag name. */
export interface TagSummary {
  name: string;
  articleCount: number;
  updatedAt: Timestamp | null;
}
