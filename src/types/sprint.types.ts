/**
 * Sprint lifecycle types — phases, contracts, and results.
 * 
 * The sprint is the core gameplay loop:
 * IDLE -> PLANNING -> ACTIVE -> REVIEW -> IDLE
 */

import { Ticket } from './ticket.types';

/** The four phases of the sprint lifecycle */
export type SprintPhase = 'idle' | 'planning' | 'active' | 'review';

/**
 * A contract represents the work package for a single sprint.
 * The player accepts a contract, works through its tickets, and collects payout.
 */
export interface Contract {
  /** Unique identifier (UUID) */
  id: string;
  /** Client name displayed to the player (e.g., "Acme Corp") */
  clientName: string;
  /** Pre-generated set of tickets for this contract */
  tickets: Ticket[];
  /** Base cash reward for completing the contract */
  payout: number;
  /** Number of in-game days the sprint lasts */
  sprintDays: number;
}

/** Performance grade based on completion percentage */
export type SprintGrade = 'S' | 'A' | 'B' | 'C' | 'F';

/**
 * Summary of sprint performance shown on the review screen.
 */
export interface SprintResult {
  /** Number of tickets moved to Done */
  ticketsCompleted: number;
  /** Total tickets in the sprint (stories only, not counting blockers) */
  ticketsTotal: number;
  /** Number of blockers the player tapped to smash */
  blockersSmashed: number;
  /** Cash earned from base payout * completion ratio */
  cashEarned: number;
  /** Extra cash from perfect completion bonus */
  bonusEarned: number;
  /** Letter grade: S(100%), A(80%+), B(60%+), C(40%+), F(<40%) */
  grade: SprintGrade;
}
