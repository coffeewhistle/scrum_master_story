/**
 * PayoutCalculator — Computes end-of-sprint/contract financials and grade.
 *
 * Two modes:
 *  - Interim: sprint N of M complete, no cash yet, just progress summary
 *  - Final: contract closes, payout curve applied, grade assigned
 */

import type { Contract, SprintGrade, SprintResult, Ticket } from '../types';
import {
  PERFECT_COMPLETION_BONUS,
  EARLY_DELIVERY_BONUS_PER_DAY,
  GRADE_THRESHOLDS,
  CONTRACT_PAYOUT_CURVE,
} from '../constants/game.constants';

function gradeFromRatio(ratio: number): SprintGrade {
  if (ratio >= GRADE_THRESHOLDS.S) return 'S';
  if (ratio >= GRADE_THRESHOLDS.A) return 'A';
  if (ratio >= GRADE_THRESHOLDS.B) return 'B';
  if (ratio >= GRADE_THRESHOLDS.C) return 'C';
  if (ratio >= GRADE_THRESHOLDS.D) return 'D';
  return 'F';
}

/**
 * Build an interim sprint result (no cash paid — more sprints remain).
 *
 * @param contract            Active contract
 * @param sprintTickets       Tickets on the board this sprint (stories + blockers)
 * @param allContractStories  All stories for this contract (for contract-wide progress)
 * @param blockersSmashed     Blockers smashed this sprint
 */
export function calculateInterimResult(
  contract: Contract,
  sprintTickets: Ticket[],
  allContractStories: Ticket[],
  blockersSmashed: number,
): SprintResult {
  const sprintStories = sprintTickets.filter((t) => t.type === 'story');
  const sprintPointsCompleted = sprintStories
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + t.storyPoints, 0);
  const sprintPointsTotal = sprintStories.reduce((sum, t) => sum + t.storyPoints, 0);

  const contractStories = allContractStories.filter((t) => t.type === 'story');
  const contractPointsCompleted = contractStories
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + t.storyPoints, 0);
  const contractPointsTotal = contractStories.reduce((sum, t) => sum + t.storyPoints, 0);

  const contractRatio = contractPointsTotal > 0
    ? contractPointsCompleted / contractPointsTotal
    : 0;

  return {
    kind: 'interim',
    sprintNumber: contract.currentSprint,
    totalSprints: contract.totalSprints,
    ticketsCompleted: sprintStories.filter((t) => t.status === 'done').length,
    ticketsTotal: sprintStories.length,
    pointsCompleted: sprintPointsCompleted,
    pointsTotal: sprintPointsTotal,
    contractPointsCompleted,
    contractPointsTotal,
    blockersSmashed,
    cashEarned: 0,
    bonusEarned: 0,
    earlyDeliveryBonus: 0,
    daysRemaining: 0,
    grade: gradeFromRatio(contractRatio),
  };
}

/**
 * Build a final contract result (cash is paid out using payout curve).
 *
 * @param contract            Closing contract
 * @param allContractStories  ALL stories for this contract (backlog + board) at close
 * @param blockersSmashed     Blockers smashed in the final sprint
 * @param daysRemaining       Days left on the final sprint clock (> 0 = shipped early)
 */
export function calculateFinalResult(
  contract: Contract,
  allContractStories: Ticket[],
  blockersSmashed: number,
  daysRemaining: number = 0,
): SprintResult {
  const storyTickets = allContractStories.filter((t) => t.type === 'story');
  const contractPointsTotal = storyTickets.reduce((sum, t) => sum + t.storyPoints, 0);
  const contractPointsCompleted = storyTickets
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + t.storyPoints, 0);

  const completionRatio = contractPointsTotal > 0
    ? contractPointsCompleted / contractPointsTotal
    : 0;

  // Payout curve: ratio^1.3 rewards full completion more than linear
  const curvedRatio = Math.pow(completionRatio, CONTRACT_PAYOUT_CURVE);
  const cashEarned = contract.payout * curvedRatio;
  const bonusEarned = completionRatio >= 1.0
    ? cashEarned * PERFECT_COMPLETION_BONUS
    : 0;
  const earlyDeliveryBonus = daysRemaining > 0
    ? contract.payout * EARLY_DELIVERY_BONUS_PER_DAY * daysRemaining
    : 0;

  const grade = gradeFromRatio(completionRatio);

  return {
    kind: 'final',
    sprintNumber: contract.currentSprint,
    totalSprints: contract.totalSprints,
    ticketsCompleted: storyTickets.filter((t) => t.status === 'done').length,
    ticketsTotal: storyTickets.length,
    pointsCompleted: contractPointsCompleted,
    pointsTotal: contractPointsTotal,
    contractPointsCompleted,
    contractPointsTotal,
    blockersSmashed,
    cashEarned,
    bonusEarned,
    earlyDeliveryBonus,
    daysRemaining,
    grade,
  };
}
