import type { ForumTopic } from '../lib/types';

export const FORUM_TOPICS: ForumTopic[] = [
  {
    id: 'olympiad-prep',
    slug: 'olympiad-prep',
    name: 'Olympiad Prep',
    description: 'IMO, Putnam, national olympiads — strategy, hard problems, and post-mortems.',
    color: '#22E0C8',
  },
  {
    id: 'calculus-analysis',
    slug: 'calculus-analysis',
    name: 'Calculus & Analysis',
    description: 'Real and complex analysis, limits, measure, functional analysis.',
    color: '#7AB4FF',
  },
  {
    id: 'discrete-math',
    slug: 'discrete-math',
    name: 'Discrete Math',
    description: 'Combinatorics, graph theory, logic, and theoretical computer science.',
    color: '#F5A524',
  },
  {
    id: 'linear-algebra',
    slug: 'linear-algebra',
    name: 'Algebra & Linear Algebra',
    description: 'Groups, rings, fields, modules, and matrices.',
    color: '#FF7AB8',
  },
  {
    id: 'site-feedback',
    slug: 'site-feedback',
    name: 'Site Feedback',
    description: 'Bug reports, feature requests, and meta discussion about ZeroSet itself.',
    color: '#A0A0B5',
  },
];

export function getTopicBySlug(slug: string): ForumTopic | undefined {
  return FORUM_TOPICS.find((t) => t.slug === slug);
}
