/**
 * SprintSimulator — Per-tick simulation logic for an active sprint.
 *
 * Responsibilities:
 *  1. Distribute developer velocity across in-progress story tickets.
 *  2. Promote completed tickets to 'done'.
 *  3. Roll for random blocker spawns (capped by MAX_ACTIVE_BLOCKERS).
 *  4. Track ticks and advance in-game days.
 *  5. Detect sprint end and trigger payout + phase transition.
 *
 * All state mutations happen through Zustand store actions, keeping this
 * module a pure orchestration layer with no internal mutable state beyond
 * the tick counter.
 */

import type { Contract, Ticket, TicketStatus } from '../types';
import {
  TICKS_PER_DAY,
  BLOCKER_SPAWN_CHANCE_PER_TICK,
  MAX_ACTIVE_BLOCKERS,
  DEFAULT_SPRINT_DAYS,
} from '../constants/game.constants';
import {
  STORY_TITLES,
  BLOCKER_TITLES,
  BLOCKER_STORY_POINTS,
  STORY_POINT_RANGE,
  TICKETS_PER_CONTRACT,
  CONTRACT_PAYOUT_RANGE,
  CLIENT_NAMES,
} from '../constants/tickets.constants';
import { randomInt, randomPick, rollChance } from '../utils/random.utils';
import { calculatePayout } from './PayoutCalculator';
import { GameLoop } from './GameLoop';

// Lazy-imported store accessors.
// The actual Zustand stores are created by the stores agent; we import them
// dynamically so this module can be loaded even if the stores don't exist
// at compile-time during early development.
import { useSprintStore } from '../stores/sprintStore';
import { useBoardStore } from '../stores/boardStore';
import { useTeamStore } from '../stores/teamStore';
import { useUIStore } from '../stores/uiStore';

// ─── Internal state ──────────────────────────────────────────────────────────

/** Ticks accumulated toward the current in-game day. */
let ticksThisDay = 0;

/** Running count of blockers the player has smashed this sprint. */
let blockersSmashed = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a v4-style random ID (good enough for game entities). */
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Contract Generator ──────────────────────────────────────────────────────

/**
 * Generate a random Contract with a fresh set of story tickets.
 *
 * All tickets start in the 'todo' column with 0 pointsCompleted.
 * The contract payout is randomised within CONTRACT_PAYOUT_RANGE.
 */
export function generateContract(): Contract {
  const ticketCount = randomInt(TICKETS_PER_CONTRACT.min, TICKETS_PER_CONTRACT.max);

  // Pick unique titles when possible (fall back to duplicates if the pool is
  // smaller than the ticket count, though currently it isn't).
  const availableTitles = [...STORY_TITLES];
  const tickets: Ticket[] = [];

  for (let i = 0; i < ticketCount; i++) {
    // Pull a title from the shrinking pool to avoid repeats within a contract.
    const titleIndex = Math.floor(Math.random() * availableTitles.length);
    const title = availableTitles.splice(titleIndex, 1)[0] ?? randomPick(STORY_TITLES);

    tickets.push({
      id: uuid(),
      type: 'story',
      title,
      storyPoints: randomInt(STORY_POINT_RANGE.min, STORY_POINT_RANGE.max),
      pointsCompleted: 0,
      status: 'todo',
    });
  }

  return {
    id: uuid(),
    clientName: randomPick(CLIENT_NAMES),
    tickets,
    payout: randomInt(CONTRACT_PAYOUT_RANGE.min, CONTRACT_PAYOUT_RANGE.max),
    sprintDays: DEFAULT_SPRINT_DAYS,
  };
}

// ─── Tick Logic ──────────────────────────────────────────────────────────────

/**
 * Reset per-sprint internal counters. Call when a new sprint begins.
 */
export function resetSimState(): void {
  ticksThisDay = 0;
  blockersSmashed = 0;
}

/**
 * Count blockers that the player has dismissed since the last reset.
 * Called by the board store or UI when a blocker is smashed, so
 * PayoutCalculator can include it in the SprintResult.
 */
export function recordBlockerSmash(): void {
  blockersSmashed++;
}

/**
 * Single simulation tick — called by GameLoop at TICK_INTERVAL_MS cadence.
 *
 * ### Blocker blocking rule
 * While ANY blocker ticket sits in 'doing', ALL story progress is paused.
 * The player must tap/smash the blocker (which removes it) to resume.
 */
export function tick(): void {
  const board = useBoardStore.getState();
  const team = useTeamStore.getState();
  const sprint = useSprintStore.getState();
  const ui = useUIStore.getState();

  const { tickets } = board;

  // ── 1. Detect active blockers ────────────────────────────────────────────
  const activeBlockers = tickets.filter(
    (t) => t.type === 'blocker' && t.status === 'doing',
  );
  const isBlocked = activeBlockers.length > 0;

  // ── 2. Progress story tickets (only when unblocked) ──────────────────────
  if (!isBlocked) {
    const doingStories = tickets.filter(
      (t) => t.type === 'story' && t.status === 'doing',
    );

    if (doingStories.length > 0) {
      // MVP: distribute velocity evenly across all doing stories.
      const velocityPerTicket = team.totalVelocity / doingStories.length;

      for (const ticket of doingStories) {
        board.progressTicket(ticket.id, velocityPerTicket);
      }
    }
  }

  // ── 3. Promote completed stories to 'done' ──────────────────────────────
  // Re-read tickets after progression because `progressTicket` may have
  // updated pointsCompleted in the store. We grab a fresh snapshot.
  const freshTickets = useBoardStore.getState().tickets;
  for (const ticket of freshTickets) {
    if (
      ticket.type === 'story' &&
      ticket.status === 'doing' &&
      ticket.pointsCompleted >= ticket.storyPoints
    ) {
      useBoardStore.getState().moveTicket(ticket.id, 'done');
    }
  }

  // ── 4. Roll for blocker spawn ────────────────────────────────────────────
  const currentActiveBlockers = useBoardStore
    .getState()
    .tickets.filter((t) => t.type === 'blocker' && t.status === 'doing').length;

  if (
    rollChance(BLOCKER_SPAWN_CHANCE_PER_TICK) &&
    currentActiveBlockers < MAX_ACTIVE_BLOCKERS
  ) {
    const blockerTicket: Ticket = {
      id: uuid(),
      type: 'blocker',
      title: randomPick(BLOCKER_TITLES),
      storyPoints: BLOCKER_STORY_POINTS,
      pointsCompleted: 0,
      status: 'doing', // Blockers go straight to 'doing'
    };
    useBoardStore.getState().spawnBlocker(blockerTicket);
    useUIStore.getState().toast('Blocker! All work is frozen!');
  }

  // ── 5. Day tracking ─────────────────────────────────────────────────────
  ticksThisDay++;

  if (ticksThisDay >= TICKS_PER_DAY) {
    ticksThisDay = 0;
    sprint.advanceDay();

    // Re-read sprint state after day advance.
    const updatedSprint = useSprintStore.getState();

    // ── 6. Sprint end check ──────────────────────────────────────────────
    if (updatedSprint.currentDay > updatedSprint.totalDays) {
      const finalTickets = useBoardStore.getState().tickets;
      const contract = updatedSprint.currentContract;

      // Transition to review phase first (stops the game loop).
      useSprintStore.getState().endSprint();
      GameLoop.stop();

      if (contract) {
        const result = calculatePayout(contract, finalTickets, blockersSmashed);

        // Show the review overlay — player will collect payout manually.
        ui.showResult(result);
      }
    }
  }
}
