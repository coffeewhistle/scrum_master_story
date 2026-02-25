/**
 * Sprint lifecycle types — phases, contracts, and results.
 *
 * The sprint lifecycle per contract:
 * IDLE -> PLANNING -> ACTIVE -> REVIEW -> PLANNING -> ACTIVE -> REVIEW -> ... -> IDLE
 */

import { Ticket } from './ticket.types';

/** The four phases of the sprint lifecycle */
export type SprintPhase = 'idle' | 'planning' | 'active' | 'review';

/**
 * A contract spans 2–4 sprints. The full story backlog is generated upfront;
 * the player drags stories into each sprint during planning.
 */
export interface Contract {
  /** Unique identifier (UUID) */
  id: string;
  /** Client name displayed to the player */
  clientName: string;
  /**
   * ALL stories for this contract — persists across sprints.
   * Stories start as 'backlog'. Completed stories become 'done'.
   * Stories on the current sprint board are NOT in this array while active.
   */
  allStories: Ticket[];
  /** Base cash reward for 100% completion */
  payout: number;
  /** Number of in-game days per sprint */
  sprintDays: number;
  /** Total number of sprints this contract spans (2, 3, or 4) */
  totalSprints: number;
  /** Which sprint we are currently on (1-indexed) */
  currentSprint: number;
}

/** Performance grade based on completion percentage */
export type SprintGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

/** Whether this result is for an interim sprint or the final contract close */
export type SprintResultKind = 'interim' | 'final';

/**
 * Summary of sprint/contract performance shown on the review screen.
 */
export interface SprintResult {
  /** 'interim' = more sprints remain; 'final' = contract is closing */
  kind: SprintResultKind;
  /** Current sprint number within the contract (e.g. 2) */
  sprintNumber: number;
  /** Total sprints for this contract (e.g. 3) */
  totalSprints: number;
  /** Stories completed THIS sprint */
  ticketsCompleted: number;
  /** Stories committed to THIS sprint */
  ticketsTotal: number;
  /** Story points completed THIS sprint */
  pointsCompleted: number;
  /** Story points committed THIS sprint */
  pointsTotal: number;
  /** Total story points completed across ALL sprints of this contract */
  contractPointsCompleted: number;
  /** Total story points across ALL stories in this contract */
  contractPointsTotal: number;
  /** Number of blockers the player smashed THIS sprint */
  blockersSmashed: number;
  /** Cash earned (only non-zero on final sprint) */
  cashEarned: number;
  /** Perfect bonus (only non-zero on final sprint at 100%) */
  bonusEarned: number;
  /** Early delivery bonus (only if shipped early on final sprint) */
  earlyDeliveryBonus: number;
  /** Days remaining when shipped early (0 otherwise) */
  daysRemaining: number;
  /** Letter grade based on contract-wide completion (only meaningful on final) */
  grade: SprintGrade;
}
