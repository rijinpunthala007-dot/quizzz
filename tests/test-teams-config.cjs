const testNames17 = [
  // Top 3 for podium
  'Bethel Pentecostal Youth',
  'St. Thomas Syrian Youth',
  'Philadelphia Church Choir',
  // 14 List teams (ranks 4..17)
  'Thekkethanarananil',
  'Panamthitta Vadakkethil',
  'Thoffil Puthenpurayil',
  'Edasserath',
  'The Good Samaritans of Galilee',
  'ha hah ahaa',
  'Grace & Truth Fellowship',
  'Covenant Faith Assembly',
  'Marthoma Youth Fellowship',
  'Mount of Olives Assembly',
  'Bethesda Deliverance Church',
  'Immanuel Global Ministries',
  'Rock of Salvation Group',
  'Holy Spirit Fire Warriors',
];

const testNames7 = [
  'Bethel Pentecostal Youth',
  'St. Thomas Syrian Youth',
  'Philadelphia Church Choir',
  'Thekkethanarananil',
  'Panamthitta Vadakkethil',
  'The Good Samaritans of Galilee',
  'ha hah ahaa',
];

const levels = [
  { id: 'lvl-1', name: 'Level 1' },
  { id: 'lvl-2', name: 'Level 2' },
  { id: 'lvl-3', name: 'Level 3' },
  { id: 'lvl-4', name: 'Level 4' },
];

function generateTeams(nameList) {
  return nameList.map((name, i) => {
    const totalBase = Math.max(10, 200 - i * 8);
    return {
      id: `team-${i + 1}`,
      name,
      out: '',
      scores: {
        'lvl-1': Math.round(totalBase * 0.3 * 10) / 10,
        'lvl-2': Math.round(totalBase * 0.25 * 10) / 10,
        'lvl-3': Math.round(totalBase * 0.25 * 10) / 10,
        'lvl-4': Math.round(totalBase * 0.2 * 10) / 10,
      },
    };
  });
}

module.exports = {
  testNames17,
  testNames7,
  levels,
  generateTeams,
};

