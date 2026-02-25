/**
 * Core game balance constants.
 * 
 * These values define the simulation's pacing and feel.
 * Tweak these to adjust difficulty and game speed.
 */

/** Milliseconds between engine ticks (1000ms = 1 tick/sec) */
export const TICK_INTERVAL_MS = 800;

/** Number of engine ticks that equal one in-game "day" */
export const TICKS_PER_DAY = 8;

/** Default sprint length in in-game days */
export const DEFAULT_SPRINT_DAYS = 10;

/** Base velocity for a single generic developer (points per tick) */
export const BASE_DEVELOPER_VELOCITY = 0.5;

/** Starting cash for a new game */
export const STARTING_CASH = 0;

/** Bonus multiplier for completing 100% of tickets */
export const PERFECT_COMPLETION_BONUS = 0.25;

/** Bonus per remaining day when delivering early (fraction of base payout) */
export const EARLY_DELIVERY_BONUS_PER_DAY = 0.05;

/** Probability (0-1) of a blocker spawning per tick during an active sprint */
export const BLOCKER_SPAWN_CHANCE_PER_TICK = 0.04;

/** Maximum number of active blockers at any time */
export const MAX_ACTIVE_BLOCKERS = 3;

/** Grade thresholds (completion percentage) */
export const GRADE_THRESHOLDS = {
  S: 1.0,   // 100%
  A: 0.8,   // 80%+
  B: 0.6,   // 60%+
  C: 0.4,   // 40%+
  D: 0.2,   // 20%+
  // Below 20% = F
} as const;

/** Maximum number of developers on the team (upgradeable in future) */
export const MAX_TEAM_SIZE = 4;

/**
 * Exponent applied to completion ratio for contract payout curve.
 * Creates a gentle curve: 100%→100%, 80%→~74%, 60%→~53%, 40%→~33%.
 */
export const CONTRACT_PAYOUT_CURVE = 1.3;
