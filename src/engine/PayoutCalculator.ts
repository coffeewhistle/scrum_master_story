/**
 * PayoutCalculator — Computes end-of-sprint financials and grade.
 *
 * Pure function: takes the contract, final ticket state, and blocker stats,
 * returns a SprintResult summary for the review screen.
 */

import type { Contract, SprintGrade, SprintResult, Ticket } from '../types';
import { PERFECT_COMPLETION_BONUS, GRADE_THRESHOLDS } from '../constants/game.constants';

/**
 * Determine the letter grade from a completion ratio using GRADE_THRESHOLDS.
 *
 * Thresholds are checked top-down:
 *   S  = 100%
 *   A  >= 80%
 *   B  >= 60%
 *   C  >= 40%
 *   F  <  40%
 */
function gradeFromRatio(ratio: number): SprintGrade {
  if (ratio >= GRADE_THRESHOLDS.S) return 'S';
  if (ratio >= GRADE_THRESHOLDS.A) return 'A';
  if (ratio >= GRADE_THRESHOLDS.B) return 'B';
  if (ratio >= GRADE_THRESHOLDS.C) return 'C';
  return 'F';
}

/**
 * Calculate the final payout and performance summary for a completed sprint.
 *
 * @param contract       The contract that was active during the sprint.
 * @param tickets        The full ticket array at sprint end (stories + blockers).
 * @param blockersSmashed Number of blocker tickets the player tapped/smashed.
 * @returns A SprintResult suitable for the review overlay.
 */
export function calculatePayout(
  contract: Contract,
  tickets: Ticket[],
  blockersSmashed: number,
): SprintResult {
  // Only story tickets count toward completion metrics.
  const storyTickets = tickets.filter((t) => t.type === 'story');
  const totalStories = storyTickets.length;
  const completedStories = storyTickets.filter((t) => t.status === 'done').length;

  // Guard against divide-by-zero (shouldn't happen in practice).
  const completionRatio = totalStories > 0 ? completedStories / totalStories : 0;

  const cashEarned = contract.payout * completionRatio;
  const bonusEarned =
    completionRatio === 1.0 ? cashEarned * PERFECT_COMPLETION_BONUS : 0;

  const grade = gradeFromRatio(completionRatio);

  return {
    ticketsCompleted: completedStories,
    ticketsTotal: totalStories,
    blockersSmashed,
    cashEarned,
    bonusEarned,
    grade,
  };
}
