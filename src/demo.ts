import type { QuizState } from './types';
import { uid } from './utils';

const DEMO_GROUPS = [
  'Faith Warriors', 'Holy Spirit', 'Grace & Truth', 'Living Water',
  'Bread of Life', 'Light of World', 'Good Shepherd', 'Alpha & Omega',
  'Burning Bush', 'Lion of Judah', 'Morning Star', 'Rock of Ages',
  'Salt & Light', 'Cornerstone', 'The Good Samaritans of Galilee', 'Royal Priests',
  'Mighty Fortress',
];

export function generateDemoState(): QuizState {
  const levels = [
    { id: uid(), name: 'Level 1' },
    { id: uid(), name: 'Level 2' },
    { id: uid(), name: 'Level 3' },
    { id: uid(), name: 'Level 4' },
  ];

  const teams = DEMO_GROUPS.map((name, i) => {
    const scores: Record<string, number> = {};
    levels.forEach((level) => {
      scores[level.id] = Math.floor(Math.random() * 60 + 20);
    });

    // Mark 2 groups as eliminated after Level 2
    const out = i >= 15 ? 'Level 2' : '';
    return {
      id: uid(),
      name,
      out,
      scores,
    };
  });

  return {
    title: 'Church Bible Quiz 2026',
    focus: 'all',
    levels,
    teams,
  };
}
