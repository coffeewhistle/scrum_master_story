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
import type { DeveloperArchetype } from '../types/developer.types';
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
  SPRINTS_PER_CONTRACT_RANGE,
} from '../constants/tickets.constants';
import {
  DEVELOPER_NAMES,
  DEVELOPER_AVATARS,
  ARCHETYPE_VELOCITY_RANGE,
  ARCHETYPE_COST_RANGE,
  ARCHETYPE_TRAITS,
  CANDIDATE_ARCHETYPE_POOL,
} from '../constants/developer.constants';
import { randomInt, randomPick, rollChance } from '../utils/random.utils';
import { calculateInterimResult, calculateFinalResult } from './PayoutCalculator';
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

/**
 * Ticks remaining on the current flow burst.
 * When > 0, team velocity gets a +20% bonus reward for completing a story.
 */
let flowBurstTicksRemaining = 0;

/** How many ticks a flow burst lasts (~5 seconds at 800ms/tick). */
const FLOW_BURST_DURATION = 6;

/** Velocity bonus multiplier during a flow burst. */
const FLOW_BURST_MULTIPLIER = 1.2;

/**
 * Penalty per story over the WIP limit (developer count).
 * e.g. 0.10 = each extra story costs 10% of total velocity.
 */
const WIP_OVERAGE_PENALTY = 0.10;

/** Minimum velocity multiplier — WIP penalty never reduces below this floor. */
const WIP_PENALTY_FLOOR = 0.40;

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
  const totalSprints = randomInt(SPRINTS_PER_CONTRACT_RANGE.min, SPRINTS_PER_CONTRACT_RANGE.max);

  const availableTitles = [...STORY_TITLES];
  const allStories: Ticket[] = [];

  for (let i = 0; i < ticketCount; i++) {
    const titleIndex = Math.floor(Math.random() * availableTitles.length);
    const title = availableTitles.splice(titleIndex, 1)[0] ?? randomPick(STORY_TITLES);

    allStories.push({
      id: uuid(),
      type: 'story',
      title,
      storyPoints: randomInt(STORY_POINT_RANGE.min, STORY_POINT_RANGE.max),
      pointsCompleted: 0,
      status: 'backlog', // All stories start in the backlog
    });
  }

  return {
    id: uuid(),
    clientName: randomPick(CLIENT_NAMES),
    allStories,
    payout: randomInt(CONTRACT_PAYOUT_RANGE.min, CONTRACT_PAYOUT_RANGE.max),
    sprintDays: DEFAULT_SPRINT_DAYS,
    totalSprints,
    currentSprint: 1,
  };
}

// ─── Tick Logic ──────────────────────────────────────────────────────────────

/**
 * Generate 3 random job board candidates and push to teamStore.
 * Called at sprint start and on initial app load.
 */
export function generateCandidates(): void {
  const usedNames = new Set(
    useTeamStore.getState().developers.map((d) => d.name),
  );

  const candidates = [];
  const usedArchetypes: DeveloperArchetype[] = [];

  for (let i = 0; i < 3; i++) {
    // Pick an archetype from the weighted pool, avoid duplicates on the board
    let archetype: DeveloperArchetype;
    let attempts = 0;
    do {
      archetype = randomPick([...CANDIDATE_ARCHETYPE_POOL]) as DeveloperArchetype;
      attempts++;
    } while (usedArchetypes.includes(archetype) && attempts < 10);
    usedArchetypes.push(archetype);

    // Pick a name not already on the team
    const namePool = DEVELOPER_NAMES[archetype].filter((n) => !usedNames.has(n));
    const name =
      namePool.length > 0
        ? randomPick(namePool)
        : randomPick(DEVELOPER_NAMES[archetype]);
    usedNames.add(name);

    const [vMin, vMax] = ARCHETYPE_VELOCITY_RANGE[archetype];
    const [cMin, cMax] = ARCHETYPE_COST_RANGE[archetype];
    const velocity =
      Math.round((vMin + Math.random() * (vMax - vMin)) * 10) / 10;

    candidates.push({
      id: uuid(),
      name,
      archetype,
      velocity,
      avatar: DEVELOPER_AVATARS[archetype],
      trait: ARCHETYPE_TRAITS[archetype],
      hireCost: randomInt(cMin, cMax),
    });
  }

  useTeamStore.getState().refreshCandidates(candidates);
}

/**
 * Reset per-sprint internal counters. Call when a new sprint begins.
 */
export function resetSimState(): void {
  ticksThisDay = 0;
  blockersSmashed = 0;
  flowBurstTicksRemaining = 0;
  useUIStore.getState().setCanShipEarly(false);
  generateCandidates(); // Refresh job board each sprint
}

/**
 * Transition from planning → active. Called when the player taps "Start Sprint"
 * after committing stories during the planning phase.
 */
export function startSprint(): void {
  const sprint = useSprintStore.getState();
  if (sprint.phase !== 'planning') return;
  useSprintStore.getState().startActivePhase();
}

/**
 * Ship the current sprint early. Called by the UI when all stories are
 * complete and the player taps "Ship Early".
 *
 * Calculates payout with an early delivery bonus based on remaining days.
 */
export function shipEarly(): void {
  const sprint = useSprintStore.getState();
  const contract = sprint.currentContract;
  if (!contract || sprint.phase !== 'active') return;

  const daysRemaining = sprint.totalDays - sprint.currentDay;
  const boardTickets = useBoardStore.getState().tickets;
  const backlogTickets = useBoardStore.getState().backlog;

  // Build full contract story list: previously done + current board + remaining backlog
  const allContractStories = [
    ...contract.allStories.filter((s) => s.status === 'done'),
    ...boardTickets.filter((t) => t.type === 'story'),
    ...backlogTickets,
  ];

  useSprintStore.getState().endSprint();
  GameLoop.stop();

  const result = calculateFinalResult(contract, allContractStories, blockersSmashed, daysRemaining);
  useUIStore.getState().showResult(result);
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
  const isPlanning = sprint.phase === 'planning';

  // ── During planning: GameLoop runs but does nothing — wait for player ──
  if (isPlanning) return;

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
      // WIP penalty: each story over the dev count costs WIP_OVERAGE_PENALTY
      const wipLimit = team.developers.length;
      const wipOverage = Math.max(0, doingStories.length - wipLimit);
      const wipMultiplier = Math.max(
        WIP_PENALTY_FLOOR,
        1 - wipOverage * WIP_OVERAGE_PENALTY,
      );

      // Flow burst: bonus velocity for recently completing a story
      if (flowBurstTicksRemaining > 0) flowBurstTicksRemaining--;
      const flowMultiplier = flowBurstTicksRemaining > 0 ? FLOW_BURST_MULTIPLIER : 1;

      const effectiveVelocity = team.totalVelocity * wipMultiplier * flowMultiplier;
      const velocityPerTicket = effectiveVelocity / doingStories.length;

      for (const ticket of doingStories) {
        board.progressTicket(ticket.id, velocityPerTicket);
      }
    }
  }

  // ── 3. Promote completed stories to 'done' ──────────────────────────────
  const freshTickets = useBoardStore.getState().tickets;
  let storiesCompletedThisTick = 0;
  for (const ticket of freshTickets) {
    if (
      ticket.type === 'story' &&
      ticket.status === 'doing' &&
      ticket.pointsCompleted >= ticket.storyPoints
    ) {
      useBoardStore.getState().moveTicket(ticket.id, 'done');
      storiesCompletedThisTick++;
    }
  }

  // Trigger flow burst when stories complete (silent — HUD velocity shows it)
  if (storiesCompletedThisTick > 0) {
    flowBurstTicksRemaining = FLOW_BURST_DURATION;
  }

  // ── 4. Roll for blocker spawn ────────────────────────────────────────────
  const latestTickets = useBoardStore.getState().tickets;
  const currentActiveBlockers = latestTickets.filter(
    (t) => t.type === 'blocker' && t.status === 'doing',
  ).length;
  const hasIncompleteWork = latestTickets.some(
    (t) => t.type === 'story' && t.status !== 'done',
  );

  const qaReduction = useTeamStore.getState().developers.reduce(
    (sum, d) => sum + (d.trait?.blockerRateReduction ?? 0),
    0,
  );
  const effectiveBlockerRate = BLOCKER_SPAWN_CHANCE_PER_TICK * Math.max(0, 1 - qaReduction);

  if (
    hasIncompleteWork &&
    rollChance(effectiveBlockerRate) &&
    currentActiveBlockers < MAX_ACTIVE_BLOCKERS
  ) {
    const blockerTicket: Ticket = {
      id: uuid(),
      type: 'blocker',
      title: randomPick(BLOCKER_TITLES),
      storyPoints: BLOCKER_STORY_POINTS,
      pointsCompleted: 0,
      status: 'doing',
    };
    useBoardStore.getState().spawnBlocker(blockerTicket);
    useUIStore.getState().toast('Blocker! All work is frozen!');
  }

  // ── 4b. Check if all sprint stories are done (ship early available) ──────
  if (!hasIncompleteWork && currentActiveBlockers === 0) {
    if (!useUIStore.getState().canShipEarly) {
      useUIStore.getState().setCanShipEarly(true);
      useUIStore.getState().toast('All tickets done! Ship early for a bonus!');
    }
  }

  // ── 5. Day tracking ─────────────────────────────────────────────────────
  ticksThisDay++;

  if (ticksThisDay >= TICKS_PER_DAY) {
    ticksThisDay = 0;
    sprint.advanceDay();

    const updatedSprint = useSprintStore.getState();

    // ── 6. Sprint end check ──────────────────────────────────────────────
    if (updatedSprint.currentDay > updatedSprint.totalDays) {
      const contract = updatedSprint.currentContract;
      if (!contract) return;

      const boardTickets = useBoardStore.getState().tickets;
      const backlogTickets = useBoardStore.getState().backlog;

      useSprintStore.getState().endSprint();
      GameLoop.stop();

      const isFinalSprint = contract.currentSprint >= contract.totalSprints;

      // Build full story list for progress calculation:
      // previously-done stories (in allStories) + current board + remaining backlog
      const allContractStories = [
        ...contract.allStories.filter((s) => s.status === 'done'),
        ...boardTickets.filter((t) => t.type === 'story'),
        ...backlogTickets,
      ];

      if (isFinalSprint) {
        const result = calculateFinalResult(contract, allContractStories, blockersSmashed);
        ui.showResult(result);
      } else {
        const result = calculateInterimResult(
          contract,
          boardTickets,
          allContractStories,
          blockersSmashed,
        );
        ui.showResult(result);
      }
    }
  }
}
