# Sprint Planning + Multi-Sprint Contracts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single-sprint-per-contract loop with multi-sprint contracts (2–4 sprints), add a planning phase (Day 1 of each sprint) where the player drags stories from backlog to board, and implement a payout curve that rewards full contract completion.

**Architecture:** Contract grows to hold `allStories` (full backlog) + `totalSprints` + `currentSprint`. `boardStore` gains a `backlog` array (stories not yet pulled into a sprint) separate from `tickets` (stories currently on the board). The planning phase runs the GameLoop normally but the `tick()` only advances days — no story progress, no blockers. A new `PlanningBoard` component renders a two-column drag-to-commit layout. `SprintResultScreen` becomes context-aware: interim sprints show a "Next Sprint" flow, final sprints show the full payout.

**Tech Stack:** React Native 0.81, Expo 54, Zustand 5, Reanimated 4, react-native-gesture-handler 2.28, TypeScript 5.9

---

## Task 1: Update types — Contract, Ticket, SprintResult, SprintPhase

**Files:**
- Modify: `src/types/sprint.types.ts`
- Modify: `src/types/ticket.types.ts`

### Step 1: Update `src/types/sprint.types.ts`

Replace the `Contract` interface and add `SprintResultKind`:

```ts
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
   * Stories start as 'todo'. Completed stories become 'done' and stay here.
   * Stories in the current sprint board are NOT in this array while active.
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
  /** Current sprint number (e.g. 2) */
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
```

### Step 2: Update `src/types/ticket.types.ts`

Add a `'backlog'` status so stories can live in the backlog without appearing on the board:

```ts
export type TicketType = 'story' | 'blocker';

/** backlog = in contract but not yet pulled into a sprint */
export type TicketStatus = 'backlog' | 'todo' | 'doing' | 'done';

export interface Ticket {
  id: string;
  type: TicketType;
  title: string;
  storyPoints: number;
  pointsCompleted: number;
  status: TicketStatus;
}
```

### Step 3: Verify build

```
npx expo export --platform web
```

Expected: TypeScript errors in many files because `Contract.tickets` is now `Contract.allStories`, and `'backlog'` is a new status. That's expected — we'll fix them in subsequent tasks. Just confirm the type files themselves parse without syntax errors.

Run `npx tsc --noEmit 2>&1 | head -40` to see the error list.

### Step 4: Commit

```
git add src/types/
git commit -m "feat(types): multi-sprint Contract, backlog TicketStatus, SprintResult kind"
```

---

## Task 2: Update constants — bigger backlog, sprint counts

**Files:**
- Modify: `src/constants/tickets.constants.ts`
- Modify: `src/constants/game.constants.ts`

### Step 1: Update `src/constants/tickets.constants.ts`

Change `TICKETS_PER_CONTRACT` to generate a larger backlog, and add `SPRINTS_PER_CONTRACT_RANGE`:

```ts
/** Total stories generated for a contract's full backlog */
export const TICKETS_PER_CONTRACT = {
  min: 12,
  max: 18,
} as const;

/** Number of sprints a contract spans */
export const SPRINTS_PER_CONTRACT_RANGE = {
  min: 2,
  max: 4,
} as const;

/** Base payout range per contract (cash) — larger to reflect multi-sprint scope */
export const CONTRACT_PAYOUT_RANGE = {
  min: 2000,
  max: 6000,
} as const;
```

Keep all other constants unchanged.

### Step 2: Add payout curve exponent to `src/constants/game.constants.ts`

```ts
/**
 * Exponent applied to completion ratio for contract payout.
 * Creates a gentle curve: 100%→100%, 80%→~74%, 60%→~53%, 40%→~33%.
 * Full completion is noticeably better than partial without being punishing.
 */
export const CONTRACT_PAYOUT_CURVE = 1.3;
```

### Step 3: Verify build

```
npx tsc --noEmit 2>&1 | head -40
```

Expected: same errors as Task 1 (no new ones from constants changes).

### Step 4: Commit

```
git add src/constants/
git commit -m "feat(constants): larger contract backlog, multi-sprint range, payout curve"
```

---

## Task 3: Update boardStore — add backlog, update actions

**Files:**
- Modify: `src/stores/boardStore.ts`

### Step 1: Rewrite `src/stores/boardStore.ts`

The board now has two separate arrays:
- `backlog`: stories available during planning (status = 'backlog')
- `tickets`: stories + blockers on the active sprint board (status = 'todo' | 'doing' | 'done')

```ts
import { create } from 'zustand';
import { Ticket, TicketStatus } from '../types/ticket.types';

export interface BoardState {
  // State
  /** Stories + blockers on the active sprint board */
  tickets: Ticket[];
  /** Stories available in the planning backlog */
  backlog: Ticket[];
  draggedTicketId: string | null;

  // Actions
  /** Set the sprint board tickets (call at sprint start with committed stories) */
  setTickets: (tickets: Ticket[]) => void;
  /** Set the backlog (call when contract is accepted or sprint ends) */
  setBacklog: (tickets: Ticket[]) => void;
  /** Move a ticket to a different column on the sprint board */
  moveTicket: (ticketId: string, toColumn: TicketStatus) => void;
  /** Progress a ticket's pointsCompleted by pointsDone */
  progressTicket: (ticketId: string, pointsDone: number) => void;
  /** Mark a blocker as done (smashed) */
  smashBlocker: (ticketId: string) => void;
  /** Add a blocker to the sprint board */
  spawnBlocker: (ticket: Ticket) => void;
  /** Move a story from backlog → sprint board (planning phase) */
  commitStory: (ticketId: string) => void;
  /** Move a story from sprint board → backlog (planning phase, undo) */
  uncommitStory: (ticketId: string) => void;
  setDraggedTicket: (id: string | null) => void;
  /** Clear sprint board (keep backlog intact for next sprint) */
  clearBoard: () => void;
  /** Clear everything (end of contract) */
  clearAll: () => void;
}

/** Selector: are there any active blockers halting work? */
export function selectIsBlocked(state: BoardState): boolean {
  return state.tickets.some(
    (t) => t.type === 'blocker' && t.status === 'doing',
  );
}

export const useBoardStore = create<BoardState>()((set) => ({
  tickets: [],
  backlog: [],
  draggedTicketId: null,

  setTickets: (tickets: Ticket[]) =>
    set({ tickets }),

  setBacklog: (tickets: Ticket[]) =>
    set({ backlog: tickets }),

  moveTicket: (ticketId: string, toColumn: TicketStatus) =>
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: toColumn } : ticket,
      ),
    })),

  progressTicket: (ticketId: string, pointsDone: number) =>
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              pointsCompleted: Math.min(
                ticket.pointsCompleted + pointsDone,
                ticket.storyPoints,
              ),
            }
          : ticket,
      ),
    })),

  smashBlocker: (ticketId: string) =>
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: 'done' as TicketStatus } : ticket,
      ),
    })),

  spawnBlocker: (ticket: Ticket) =>
    set((state) => ({
      tickets: [...state.tickets, ticket],
    })),

  commitStory: (ticketId: string) =>
    set((state) => {
      const story = state.backlog.find((t) => t.id === ticketId);
      if (!story) return state;
      return {
        backlog: state.backlog.filter((t) => t.id !== ticketId),
        tickets: [...state.tickets, { ...story, status: 'todo' as TicketStatus }],
      };
    }),

  uncommitStory: (ticketId: string) =>
    set((state) => {
      const story = state.tickets.find((t) => t.id === ticketId && t.type === 'story');
      if (!story) return state;
      return {
        tickets: state.tickets.filter((t) => t.id !== ticketId),
        backlog: [...state.backlog, { ...story, status: 'backlog' as TicketStatus }],
      };
    }),

  setDraggedTicket: (id: string | null) =>
    set({ draggedTicketId: id }),

  clearBoard: () =>
    set({ tickets: [], draggedTicketId: null }),

  clearAll: () =>
    set({ tickets: [], backlog: [], draggedTicketId: null }),
}));
```

### Step 2: Verify build

```
npx tsc --noEmit 2>&1 | head -40
```

### Step 3: Commit

```
git add src/stores/boardStore.ts
git commit -m "feat(store): boardStore with backlog, commitStory, uncommitStory, clearAll"
```

---

## Task 4: Update sprintStore — multi-sprint contract tracking

**Files:**
- Modify: `src/stores/sprintStore.ts`

### Step 1: Rewrite `src/stores/sprintStore.ts`

Add `contractSprintIndex` (which sprint of the contract we're on), and update actions:

```ts
import { create } from 'zustand';
import { SprintPhase, Contract } from '../types/sprint.types';
import { DEFAULT_SPRINT_DAYS, STARTING_CASH } from '../constants/game.constants';

interface SprintState {
  // State
  phase: SprintPhase;
  currentDay: number;
  totalDays: number;
  cashOnHand: number;
  currentContract: Contract | null;
  sprintNumber: number;       // total sprints played across all contracts

  // Actions
  /** Begin planning phase for a new contract */
  acceptContract: (contract: Contract) => void;
  /** Transition from planning → active (Day 1 ends) */
  startActivePhase: () => void;
  advanceDay: () => void;
  endSprint: () => void;
  /** Advance to next sprint within same contract */
  advanceContractSprint: () => void;
  /** Close the contract and bank payout */
  collectPayout: (amount: number) => void;
  spendCash: (amount: number) => void;
  reset: () => void;
}

const initialState = {
  phase: 'idle' as SprintPhase,
  currentDay: 0,
  totalDays: DEFAULT_SPRINT_DAYS,
  cashOnHand: STARTING_CASH,
  currentContract: null as Contract | null,
  sprintNumber: 0,
};

export const useSprintStore = create<SprintState>()((set) => ({
  ...initialState,

  acceptContract: (contract: Contract) =>
    set((state) => ({
      phase: 'planning',
      currentDay: 1,
      totalDays: contract.sprintDays,
      currentContract: contract,
      sprintNumber: state.sprintNumber + 1,
    })),

  startActivePhase: () =>
    set({ phase: 'active' }),

  advanceDay: () =>
    set((state) => ({
      currentDay: state.currentDay + 1,
    })),

  endSprint: () =>
    set({ phase: 'review' }),

  advanceContractSprint: () =>
    set((state) => {
      if (!state.currentContract) return state;
      return {
        phase: 'planning',
        currentDay: 1,
        currentContract: {
          ...state.currentContract,
          currentSprint: state.currentContract.currentSprint + 1,
        },
        sprintNumber: state.sprintNumber + 1,
      };
    }),

  collectPayout: (amount: number) =>
    set((state) => ({
      cashOnHand: state.cashOnHand + amount,
      phase: 'idle',
      currentContract: null,
      currentDay: 0,
    })),

  spendCash: (amount: number) =>
    set((state) => ({
      cashOnHand: Math.max(0, state.cashOnHand - amount),
    })),

  reset: () => set(initialState),
}));
```

### Step 2: Verify build

```
npx tsc --noEmit 2>&1 | head -40
```

### Step 3: Commit

```
git add src/stores/sprintStore.ts
git commit -m "feat(store): sprintStore multi-sprint — acceptContract, advanceContractSprint"
```

---

## Task 5: Update PayoutCalculator for contract-wide payout curve

**Files:**
- Modify: `src/engine/PayoutCalculator.ts`

### Step 1: Rewrite `src/engine/PayoutCalculator.ts`

The payout is now calculated at **contract close** using all stories across all sprints, with the `^1.3` curve:

```ts
/**
 * PayoutCalculator — Computes end-of-sprint/contract financials and grade.
 */

import type { Contract, SprintGrade, SprintResult, SprintResultKind, Ticket } from '../types';
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
 * @param contract        Active contract
 * @param sprintTickets   Tickets on the board this sprint
 * @param allContractStories  All stories ever on the contract (for contract-wide progress)
 * @param blockersSmashed Blockers smashed this sprint
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

  const contractPointsCompleted = allContractStories
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + t.storyPoints, 0);
  const contractPointsTotal = allContractStories.reduce((sum, t) => sum + t.storyPoints, 0);

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
 * @param contract        Closing contract
 * @param allContractStories  All stories (backlog + board) at contract close
 * @param blockersSmashed Blockers smashed in the final sprint
 * @param daysRemaining   Days left on the final sprint clock (> 0 = shipped early)
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

  // Apply payout curve: ratio^1.3 rewards full completion noticeably more
  const curvedRatio = Math.pow(completionRatio, CONTRACT_PAYOUT_CURVE);
  const cashEarned = contract.payout * curvedRatio;
  const bonusEarned = completionRatio >= 1.0
    ? cashEarned * PERFECT_COMPLETION_BONUS
    : 0;
  const earlyDeliveryBonus = daysRemaining > 0
    ? contract.payout * EARLY_DELIVERY_BONUS_PER_DAY * daysRemaining
    : 0;

  const grade = gradeFromRatio(completionRatio);

  // Sprint-level stats (final sprint only)
  const finalSprintStories = storyTickets.filter((t) => t.status === 'done');

  return {
    kind: 'final',
    sprintNumber: contract.currentSprint,
    totalSprints: contract.totalSprints,
    ticketsCompleted: finalSprintStories.length,
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

// Keep old calculatePayout as a compatibility shim during migration
// (will be removed once SprintSimulator is updated in Task 6)
export { calculateFinalResult as calculatePayout };
```

### Step 2: Verify build

```
npx tsc --noEmit 2>&1 | head -40
```

### Step 3: Commit

```
git add src/engine/PayoutCalculator.ts
git commit -m "feat(engine): payout curve ^1.3, calculateInterimResult, calculateFinalResult"
```

---

## Task 6: Rewrite SprintSimulator — planning tick, multi-sprint flow

**Files:**
- Modify: `src/engine/SprintSimulator.ts`

### Step 1: Update `generateContract()` to use new Contract shape

Replace the old `generateContract` function:

```ts
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
      status: 'backlog',  // All stories start in the backlog
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
```

Add the new import at the top:
```ts
import { SPRINTS_PER_CONTRACT_RANGE } from '../constants/tickets.constants';
```

### Step 2: Update imports in SprintSimulator

Replace `calculatePayout` import with named imports:
```ts
import { calculateInterimResult, calculateFinalResult } from './PayoutCalculator';
```

### Step 3: Update `resetSimState` 

```ts
export function resetSimState(): void {
  ticksThisDay = 0;
  blockersSmashed = 0;
  useUIStore.getState().setCanShipEarly(false);
  generateCandidates();
}
```

(No change needed — already correct.)

### Step 4: Update `shipEarly` to use final result

```ts
export function shipEarly(): void {
  const sprint = useSprintStore.getState();
  const contract = sprint.currentContract;
  if (!contract || sprint.phase !== 'active') return;

  const daysRemaining = sprint.totalDays - sprint.currentDay;
  const boardTickets = useBoardStore.getState().tickets;
  const backlogTickets = useBoardStore.getState().backlog;

  // Merge board done stories + remaining backlog for full contract picture
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
```

### Step 5: Update `tick()` — planning day logic and multi-sprint end

Replace the `tick()` function:

```ts
export function tick(): void {
  const board = useBoardStore.getState();
  const team = useTeamStore.getState();
  const sprint = useSprintStore.getState();
  const ui = useUIStore.getState();

  const { tickets } = board;
  const isPlanning = sprint.phase === 'planning';

  // ── During planning: only advance days, no story progress or blockers ──
  if (isPlanning) {
    ticksThisDay++;
    if (ticksThisDay >= TICKS_PER_DAY) {
      ticksThisDay = 0;
      // Planning day ends — transition to active execution
      useSprintStore.getState().startActivePhase();
      useSprintStore.getState().advanceDay();
    }
    return; // Skip all simulation during planning
  }

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
      const velocityPerTicket = team.totalVelocity / doingStories.length;
      for (const ticket of doingStories) {
        board.progressTicket(ticket.id, velocityPerTicket);
      }
    }
  }

  // ── 3. Promote completed stories to 'done' ──────────────────────────────
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

  // ── 4b. Check if all sprint stories are done (ship early) ───────────────
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

      if (isFinalSprint) {
        // Contract closes — calculate payout across all stories
        const allContractStories = [
          ...contract.allStories.filter((s) => s.status === 'done'),
          ...boardTickets.filter((t) => t.type === 'story'),
          ...backlogTickets,
        ];
        const result = calculateFinalResult(contract, allContractStories, blockersSmashed);
        ui.showResult(result);
      } else {
        // Interim sprint — build summary, no cash yet
        const allContractStories = [
          ...contract.allStories.filter((s) => s.status === 'done'),
          ...boardTickets.filter((t) => t.type === 'story'),
          ...backlogTickets,
        ];
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
```

### Step 6: Verify build

```
npx expo export --platform web
```

Expected: Still some errors from GameScreen and SprintResultScreen not updated yet. Check that SprintSimulator itself has no new errors.

### Step 7: Commit

```
git add src/engine/SprintSimulator.ts src/constants/tickets.constants.ts
git commit -m "feat(engine): multi-sprint tick, planning day, interim/final results"
```

---

## Task 7: Create PlanningBoard component

**Files:**
- Create: `src/components/PlanningBoard.tsx`

### Step 1: Create `src/components/PlanningBoard.tsx`

This is a two-column layout: Backlog (left) | This Sprint (right). Each story is a tap-to-commit card (no drag for now — we'll keep it simple and reliable). A capacity bar shows committed vs capacity.

```tsx
/**
 * PlanningBoard — Two-column planning layout shown during the planning phase.
 *
 * Left column: stories in the backlog (tap to commit to sprint)
 * Right column: stories committed to this sprint (tap to return to backlog)
 * Bottom: capacity bar showing committed points vs team capacity
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useBoardStore } from '../stores/boardStore';
import { useTeamStore } from '../stores/teamStore';
import { useSprintStore } from '../stores/sprintStore';
import { colors } from '../constants/theme';
import { TICKS_PER_DAY, DEFAULT_SPRINT_DAYS } from '../constants/game.constants';
import type { Ticket } from '../types';

const PlanningBoard: React.FC = () => {
  const backlog = useBoardStore((s) => s.backlog);
  const tickets = useBoardStore((s) => s.tickets);
  const commitStory = useBoardStore((s) => s.commitStory);
  const uncommitStory = useBoardStore((s) => s.uncommitStory);
  const { totalVelocity } = useTeamStore();
  const { totalDays } = useSprintStore();

  // Capacity = velocity × ticks per active day × active days (totalDays - 1 for planning day)
  const activeDays = Math.max(1, totalDays - 1);
  const capacity = Math.round(totalVelocity * TICKS_PER_DAY * activeDays);

  const committedStories = tickets.filter((t) => t.type === 'story');
  const committedPoints = committedStories.reduce((sum, t) => sum + t.storyPoints, 0);
  const isOverCapacity = committedPoints > capacity;
  const capacityRatio = capacity > 0 ? Math.min(committedPoints / capacity, 1.5) : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Sprint Planning</Text>
        <Text style={styles.headerSub}>Tap stories to commit them to this sprint</Text>
      </View>

      {/* Columns */}
      <View style={styles.columns}>
        {/* Backlog column */}
        <View style={styles.column}>
          <View style={[styles.columnHeader, { backgroundColor: colors.accent }]}>
            <Text style={styles.columnTitle}>BACKLOG</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{backlog.length}</Text>
            </View>
          </View>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {backlog.length === 0 ? (
              <Text style={styles.emptyText}>All stories committed!</Text>
            ) : (
              backlog.map((ticket) => (
                <BacklogCard
                  key={ticket.id}
                  ticket={ticket}
                  onCommit={() => commitStory(ticket.id)}
                />
              ))
            )}
          </ScrollView>
        </View>

        {/* This Sprint column */}
        <View style={styles.column}>
          <View style={[styles.columnHeader, { backgroundColor: colors.info }]}>
            <Text style={styles.columnTitle}>THIS SPRINT</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{committedStories.length}</Text>
            </View>
          </View>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {committedStories.length === 0 ? (
              <Text style={styles.emptyText}>Tap backlog stories to add them</Text>
            ) : (
              committedStories.map((ticket) => (
                <CommittedCard
                  key={ticket.id}
                  ticket={ticket}
                  onUncommit={() => uncommitStory(ticket.id)}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>

      {/* Capacity bar */}
      <View style={styles.capacityBar}>
        <View style={styles.capacityLabelRow}>
          <Text style={styles.capacityLabel}>
            Capacity: {committedPoints} / {capacity} pts
          </Text>
          {isOverCapacity && (
            <Animated.Text
              entering={FadeIn.duration(200)}
              style={styles.overCapacityWarning}
            >
              ⚠️ Overcommitted!
            </Animated.Text>
          )}
        </View>
        <View style={styles.capacityTrack}>
          <View
            style={[
              styles.capacityFill,
              {
                width: `${Math.min(capacityRatio * 100, 100)}%` as any,
                backgroundColor: isOverCapacity ? colors.danger : colors.success,
              },
            ]}
          />
          {/* Capacity marker line */}
          {isOverCapacity && (
            <View style={styles.capacityMarker} />
          )}
        </View>
      </View>
    </View>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const BacklogCard: React.FC<{ ticket: Ticket; onCommit: () => void }> = ({
  ticket,
  onCommit,
}) => (
  <TouchableOpacity
    style={styles.card}
    onPress={onCommit}
    activeOpacity={0.7}
  >
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {ticket.title}
      </Text>
      <View style={styles.pointsBadge}>
        <Text style={styles.pointsText}>{ticket.storyPoints}</Text>
      </View>
    </View>
    <Text style={styles.cardAction}>+ Add to sprint</Text>
  </TouchableOpacity>
);

const CommittedCard: React.FC<{ ticket: Ticket; onUncommit: () => void }> = ({
  ticket,
  onUncommit,
}) => (
  <TouchableOpacity
    style={[styles.card, styles.committedCard]}
    onPress={onUncommit}
    activeOpacity={0.7}
  >
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {ticket.title}
      </Text>
      <View style={[styles.pointsBadge, styles.committedPointsBadge]}>
        <Text style={styles.pointsText}>{ticket.storyPoints}</Text>
      </View>
    </View>
    <Text style={styles.cardActionRemove}>✕ Remove</Text>
  </TouchableOpacity>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  headerSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingTop: 4,
    gap: 4,
  },
  column: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    overflow: 'hidden',
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  columnTitle: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: 'center',
  },
  countText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 6,
    gap: 6,
    paddingBottom: 16,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  committedCard: {
    borderLeftColor: colors.info,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  pointsBadge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  committedPointsBadge: {
    backgroundColor: colors.info,
  },
  pointsText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  cardAction: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  cardActionRemove: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  capacityBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.accent,
  },
  capacityLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  capacityLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  overCapacityWarning: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  capacityTrack: {
    height: 10,
    backgroundColor: colors.bgTrack,
    borderRadius: 5,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 5,
  },
  capacityMarker: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.danger,
  },
});

export default PlanningBoard;
```

### Step 2: Verify build

```
npx expo export --platform web
```

### Step 3: Commit

```
git add src/components/PlanningBoard.tsx
git commit -m "feat(ui): PlanningBoard component — backlog/sprint columns, capacity bar"
```

---

## Task 8: Update SprintResultScreen — interim vs final flow

**Files:**
- Modify: `src/screens/SprintResultScreen.tsx`

### Step 1: Read the current file, then update

The screen now has two modes:

**Interim mode** (`result.kind === 'interim'`):
- Header: "Sprint N of M Complete"
- Shows sprint-level stats (tickets this sprint, blockers smashed)
- Shows contract-wide progress bar
- NO cash breakdown (no money yet)
- Button: "Next Sprint →" (calls `advanceContractSprint` + clears board + resets sim)

**Final mode** (`result.kind === 'final'`):
- Header: "Contract Complete!"
- Shows full stats + payout curve cash breakdown
- Button: "💰 Collect & Continue" (calls `collectPayout` + clears all + dismisses)

Key changes to `handleCollect`:

```tsx
const advanceContractSprint = useSprintStore((s) => s.advanceContractSprint);

const handleAction = () => {
  if (result.kind === 'interim') {
    // Keep contract alive, move done stories to allStories, reset board for next sprint
    // The contract's allStories needs updating with this sprint's done stories
    // We'll handle this by calling a new boardStore action: returnBoardToContract
    // For now: clear board, advance sprint in store
    clearBoard();
    dismissResult();
    advanceContractSprint();
    resetSimState();
    GameLoop.start();
  } else {
    // Final: bank cash, clear everything
    collectPayout(totalEarned);
    clearAll();  // Use clearAll instead of clearBoard
    dismissResult();
  }
};
```

Import `clearAll` from boardStore:
```tsx
const clearAll = useBoardStore((s) => s.clearAll);
```

Import `resetSimState` and `GameLoop`:
```tsx
import { resetSimState } from '../engine/SprintSimulator';
import { GameLoop } from '../engine/GameLoop';
```

Full render structure:

```tsx
// Interim view
if (result.kind === 'interim') {
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleAction}>
      <View style={styles.overlay}>
        <Animated.View entering={SlideInDown.springify().damping(14)} style={styles.card}>
          <Text style={styles.interimTitle}>
            Sprint {result.sprintNumber} of {result.totalSprints} Complete
          </Text>
          <Text style={styles.interimSubtitle}>
            {result.totalSprints - result.sprintNumber} sprint{result.totalSprints - result.sprintNumber !== 1 ? 's' : ''} remaining on this contract
          </Text>

          <View style={styles.divider} />

          {/* This sprint stats */}
          <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.statsContainer}>
            <StatRow label="Stories This Sprint" value={`${result.ticketsCompleted} / ${result.ticketsTotal}`} />
            <StatRow label="Points This Sprint" value={`${result.pointsCompleted} / ${result.pointsTotal} pts`} />
            <StatRow label="Blockers Smashed" value={`${result.blockersSmashed}`} icon="💥" />
          </Animated.View>

          <View style={styles.divider} />

          {/* Contract-wide progress */}
          <Animated.View entering={FadeIn.delay(400).duration(400)} style={{ width: '100%' }}>
            <Text style={styles.contractProgressLabel}>
              Contract Progress: {result.contractPointsCompleted} / {result.contractPointsTotal} pts
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {
                width: `${result.contractPointsTotal > 0 ? (result.contractPointsCompleted / result.contractPointsTotal) * 100 : 0}%` as any
              }]} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(600).duration(400)} style={{ width: '100%', marginTop: 20 }}>
            <TouchableOpacity style={styles.nextSprintButton} onPress={handleAction} activeOpacity={0.8}>
              <Text style={styles.nextSprintButtonText}>Next Sprint →</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Final view (existing layout with minor updates)
// totalEarned = cashEarned + bonusEarned + earlyDeliveryBonus
// button text = '💰 Collect & Continue'
// grade display remains the same
```

Add styles:
```ts
interimTitle: {
  color: colors.textPrimary,
  fontSize: 18,
  fontWeight: '900',
  textAlign: 'center',
  marginBottom: 4,
},
interimSubtitle: {
  color: colors.textSecondary,
  fontSize: 12,
  textAlign: 'center',
},
contractProgressLabel: {
  color: colors.textSecondary,
  fontSize: 12,
  marginBottom: 6,
},
progressTrack: {
  height: 8,
  backgroundColor: colors.bgTrack,
  borderRadius: 4,
  overflow: 'hidden',
},
progressFill: {
  height: '100%',
  backgroundColor: colors.success,
  borderRadius: 4,
},
nextSprintButton: {
  backgroundColor: colors.info,
  borderRadius: 10,
  paddingVertical: 14,
  alignItems: 'center',
},
nextSprintButtonText: {
  color: colors.textPrimary,
  fontSize: 16,
  fontWeight: '900',
},
```

### Step 2: Verify build

```
npx expo export --platform web
```

### Step 3: Commit

```
git add src/screens/SprintResultScreen.tsx
git commit -m "feat(ui): SprintResultScreen interim/final modes, Next Sprint flow"
```

---

## Task 9: Update GameScreen — wire planning phase and new contract flow

**Files:**
- Modify: `src/screens/GameScreen.tsx`

### Step 1: Read the file, then update

Replace `handleStartSprint` with `handleAcceptContract`:

```tsx
const handleAcceptContract = useCallback(() => {
  if (useSprintStore.getState().phase !== 'idle') return;

  const contract = generateContract();

  // Set the full backlog in boardStore (all stories start as 'backlog')
  useBoardStore.getState().setBacklog(contract.allStories);
  useBoardStore.getState().setTickets([]); // Sprint board starts empty

  // Accept contract (transitions to 'planning')
  useSprintStore.getState().acceptContract(contract);

  // Reset sim state and start GameLoop (planning day counts down)
  resetSimState();
  GameLoop.start();
}, []);
```

Update the bottom bar to handle `planning` phase:

```tsx
{/* Bottom bar */}
<View style={styles.bottomBar}>
  {phase === 'idle' && (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.startContainer}>
      <TouchableOpacity style={styles.startButton} onPress={handleAcceptContract} activeOpacity={0.8}>
        <Text style={styles.startButtonEmoji}>📝</Text>
        <Text style={styles.startButtonText}>Accept Contract</Text>
      </TouchableOpacity>
      <Text style={styles.idleHint}>
        {sprintNumber === 0
          ? 'Accept your first contract to begin!'
          : `Sprint #${sprintNumber} complete! Cash: ${formatCash(cashOnHand)}`}
      </Text>
    </Animated.View>
  )}

  {phase === 'planning' && <SprintTimer />}

  {phase === 'active' && (
    <>
      <SprintTimer />
      {canShipEarly && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.shipEarlyContainer}>
          <TouchableOpacity style={styles.shipEarlyButton} onPress={shipEarly} activeOpacity={0.8}>
            <Text style={styles.shipEarlyEmoji}>📦</Text>
            <Text style={styles.shipEarlyText}>Ship Early</Text>
          </TouchableOpacity>
          <Text style={styles.shipEarlyHint}>Deliver ahead of schedule for a bonus!</Text>
        </Animated.View>
      )}
    </>
  )}
</View>
```

Replace `<KanbanBoard />` with phase-aware board:

```tsx
import PlanningBoard from '../components/PlanningBoard';

{/* Main board area */}
<View style={styles.boardArea}>
  {phase === 'planning' ? <PlanningBoard /> : <KanbanBoard />}
</View>
```

### Step 2: Verify build

```
npx expo export --platform web
```
Expected: clean build.

### Step 3: Commit

```
git add src/screens/GameScreen.tsx
git commit -m "feat(ui): GameScreen planning phase — PlanningBoard, acceptContract flow"
```

---

## Task 10: Update HUD — show contract sprint counter

**Files:**
- Modify: `src/components/HUD.tsx`

### Step 1: Update sprint label to show contract sprint counter

In the HUD, change the sprint label logic:

```tsx
const currentContract = useSprintStore((s) => s.currentContract);

// In JSX:
<Text style={styles.label}>
  {phase === 'active' || phase === 'planning' || phase === 'review'
    ? currentContract
      ? `Sprint ${currentContract.currentSprint}/${currentContract.totalSprints}`
      : `Sprint #${sprintNumber}`
    : 'Sprint'}
</Text>
```

### Step 2: Update day display for planning phase

```tsx
<Text style={styles.value}>
  {phase === 'idle'
    ? 'Idle'
    : phase === 'planning'
    ? 'Planning'
    : formatDay(currentDay, totalDays)}
</Text>
```

### Step 3: Verify build

```
npx expo export --platform web
```

### Step 4: Commit

```
git add src/components/HUD.tsx
git commit -m "feat(ui): HUD shows contract sprint N/M, Planning day label"
```

---

## Task 11: Update TeamDrawer — show capacity contribution on job board cards

**Files:**
- Modify: `src/components/TeamDrawer.tsx`

### Step 1: Add `+X pts/sprint` stat to CandidateCard

Import constants:
```tsx
import { TICKS_PER_DAY, DEFAULT_SPRINT_DAYS } from '../constants/game.constants';
```

In `CandidateCard`, compute and display the capacity contribution:

```tsx
// Above the return, inside CandidateCard:
const activeDays = DEFAULT_SPRINT_DAYS - 1; // subtract planning day
const ptsPerSprint = Math.round(candidate.velocity * TICKS_PER_DAY * activeDays);
```

Add to the card info section, after the archetype badge row:

```tsx
<Text style={styles.capacityStat}>+{ptsPerSprint} pts/sprint</Text>
```

Add style:
```ts
capacityStat: {
  color: colors.success,
  fontSize: 11,
  fontWeight: '700',
  marginTop: 4,
},
```

### Step 2: Verify build

```
npx expo export --platform web
```

### Step 3: Commit

```
git add src/components/TeamDrawer.tsx
git commit -m "feat(ui): show +X pts/sprint capacity stat on job board candidates"
```

---

## Task 12: Final smoke test and cleanup

### Step 1: Full build

```
npx expo export --platform web
```
Expected: clean build, no TypeScript errors, no unused imports.

### Step 2: Manual smoke test checklist

Play through the following:

1. **Accept Contract** → board shows PlanningBoard with backlog of 12+ stories, sprint board empty
2. Tap several stories to commit them → they move to "This Sprint", capacity bar fills
3. Commit more than capacity → bar turns red, "⚠️ Overcommitted!" appears
4. Wait for Day 1 to end (watch SprintTimer) → transitions to active, KanbanBoard appears with committed stories
5. Play through the sprint → stories auto-progress, blockers spawn
6. Sprint ends → Interim screen shows "Sprint 1 of 3 Complete", contract progress bar, "Next Sprint →"
7. Tap "Next Sprint →" → PlanningBoard returns with remaining backlog
8. Repeat until final sprint → Final screen shows grade, payout, collect button
9. Open Team drawer → Job Board candidates show "+X pts/sprint"
10. HUD shows "Sprint 1/3" during active phase, "Planning" during planning

### Step 3: Cleanup commit

```
git add -A
git commit -m "chore: sprint planning smoke test cleanup"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `sprint.types.ts`, `ticket.types.ts` | Multi-sprint Contract, backlog status, SprintResult kind |
| 2 | `tickets.constants.ts`, `game.constants.ts` | Larger backlog, sprint counts, payout curve constant |
| 3 | `boardStore.ts` | backlog array, commitStory, uncommitStory, clearAll |
| 4 | `sprintStore.ts` | acceptContract, startActivePhase, advanceContractSprint |
| 5 | `PayoutCalculator.ts` | Payout curve ^1.3, calculateInterimResult, calculateFinalResult |
| 6 | `SprintSimulator.ts` | Planning tick, multi-sprint end, new contract shape |
| 7 | `PlanningBoard.tsx` | Two-column planning UI with capacity bar |
| 8 | `SprintResultScreen.tsx` | Interim vs final modes, Next Sprint flow |
| 9 | `GameScreen.tsx` | acceptContract, phase-aware board, planning bottom bar |
| 10 | `HUD.tsx` | Contract sprint counter N/M, Planning day label |
| 11 | `TeamDrawer.tsx` | +X pts/sprint on job board candidates |
| 12 | — | Smoke test and cleanup |
