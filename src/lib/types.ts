export type Difficulty = 'Accessible' | 'Intermediate' | 'Advanced' | 'Hard' | 'Olympiad';

export type SetScope = 'official' | 'community';
export type SetStatus = 'draft' | 'published';

// A problem used for static seed data (legacy weeks.ts) and DB rows.
export interface Problem {
  id: string;
  index: number;
  title: string;
  difficulty: Difficulty;
  statement: string;
  connection: string;
  answer: string;
  proof: string;
}

export interface WeekSet {
  id: string;
  weekNumber: number;
  title: string;
  umbrella: string;
  description: string;
  publishDate: string;
  revealDate: string;
  problems: Problem[];
}

// DB row shapes
export interface DbWeekSet {
  id: string;
  owner_id: string;
  owner_name: string;
  scope: SetScope;
  status: SetStatus;
  title: string;
  umbrella: string | null;
  description: string | null;
  week_number: number | null;
  publish_at: string | null;
  reveal_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProblem {
  id: string;
  set_id: string;
  index: number;
  title: string;
  difficulty: Difficulty;
  statement: string;
  connection: string | null;
  answer: string | null;
  proof: string | null;
  created_at: string;
}

export interface Solution {
  id: string;
  problem_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface ForumTopic {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
}

export interface ForumThread {
  id: string;
  topic_id: string;
  title: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface ForumReply {
  id: string;
  thread_id: string;
  parent_id: string | null;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}
