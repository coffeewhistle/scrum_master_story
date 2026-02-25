import type { DeveloperArchetype, DeveloperTrait } from '../types/developer.types';

/** Display name pools per archetype */
export const DEVELOPER_NAMES: Record<DeveloperArchetype, string[]> = {
  junior: [
    'Alex the Intern', 'Casey Chen', 'Jordan Park', 'Riley Nguyen',
    'Sam Torres', 'Morgan Lee', 'Drew Kim', 'Avery Patel',
  ],
  mid: [
    'Chris Ramirez', 'Taylor Okonkwo', 'Jamie Singh', 'Quinn Andersen',
    'Blake Hoffman', 'Skyler Yamamoto', 'Devon Walsh', 'Reese Kowalski',
  ],
  senior: [
    'Dr. Evelyn Shaw', 'Marcus Delacroix', 'Priya Nair', 'Felix Bauer',
    'Ingrid Svensson', 'Leo Tanaka', 'Niamh O\'Brien', 'Omar Farouk',
  ],
  qa: [
    'Pat the Bug Hunter', 'Sage Brennan', 'River Osei', 'Frankie Dubois',
    'Harley Reyes', 'Kendall Moore', 'Billie Varga', 'Arlo Petrov',
  ],
  scrumMaster: [
    'The Coach', 'Mx. Agile', 'Coach Kofi', 'Sensei Huang',
    'Facilitator Femi', 'Guru Lena', 'Maestro Raj', 'Director Iris',
  ],
};

/** Emoji avatar per archetype */
export const DEVELOPER_AVATARS: Record<DeveloperArchetype, string> = {
  junior:      '🧑‍💻',
  mid:         '👩‍💻',
  senior:      '🧙‍♂️',
  qa:          '🔍',
  scrumMaster: '🎯',
};

/** Archetype display label */
export const ARCHETYPE_LABELS: Record<DeveloperArchetype, string> = {
  junior:      'Junior Dev',
  mid:         'Mid Dev',
  senior:      'Senior Dev',
  qa:          'QA Engineer',
  scrumMaster: 'Scrum Master',
};

/**
 * Velocity range [min, max] per archetype (pts per tick).
 * One tick = 800ms. Base is 0.5 for a Junior.
 */
export const ARCHETYPE_VELOCITY_RANGE: Record<DeveloperArchetype, [number, number]> = {
  junior:      [0.4, 0.6],
  mid:         [0.8, 1.2],
  senior:      [1.4, 1.8],
  qa:          [0.2, 0.4],
  scrumMaster: [0.1, 0.1],
};

/** Hire cost range [min, max] per archetype */
export const ARCHETYPE_COST_RANGE: Record<DeveloperArchetype, [number, number]> = {
  junior:      [400,  700],
  mid:         [1000, 1500],
  senior:      [2000, 2800],
  qa:          [600,  900],
  scrumMaster: [1500, 2000],
};

/** Trait definition per archetype (undefined = no trait) */
export const ARCHETYPE_TRAITS: Record<DeveloperArchetype, DeveloperTrait | undefined> = {
  junior:      undefined,
  mid:         undefined,
  senior:      undefined,
  qa: {
    label: 'Bug Shield',
    description: 'Reduces blocker spawn rate by 25%',
    blockerRateReduction: 0.25,
  },
  scrumMaster: {
    label: 'Velocity Aura',
    description: '+10% team velocity while on roster',
    velocityAura: 0.10,
  },
};

/**
 * Weighted archetype pool for candidate rolling.
 * Junior appears more frequently than rare archetypes.
 */
export const CANDIDATE_ARCHETYPE_POOL: DeveloperArchetype[] = [
  'junior', 'junior', 'mid', 'mid', 'senior', 'qa', 'scrumMaster',
];
