# MVP Playtest & Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all bugs and add game feel polish to make the MVP fun and playable for external playtesters.

**Architecture:** Three waves -- (1) Critical bugs that break gameplay, (2) Game feel that makes the loop satisfying, (3) Visual polish and code quality. Each wave can be committed independently.

**Tech Stack:** React Native 0.81, Expo 54, Zustand 5, Reanimated 4, TypeScript 5.9

---

## Wave 1: Critical Bugs (Must Fix)

### Task 1: Stop the GameLoop when sprint ends + cleanup on unmount

**Files:**
- Modify: `src/screens/GameScreen.tsx:37-54`
- Modify: `src/engine/SprintSimulator.ts:203-218`

**Step 1: Add useEffect cleanup to stop GameLoop on unmount**

In `GameScreen.tsx`, add a `useEffect` that stops the game loop when the component unmounts, and also stop it when the sprint ends:

```tsx
// Add after line 39
React.useEffect(() => {
  return () => {
    GameLoop.stop();
  };
}, []);
```

**Step 2: Stop the GameLoop explicitly when the sprint ends**

In `SprintSimulator.ts`, after `endSprint()` is called (line 209), add:

```ts
import { GameLoop } from './GameLoop';

// Inside the sprint-end block, after endSprint():
GameLoop.stop();
```

**Step 3: Verify the app builds**

Run: `npx expo export --platform web`
Expected: Clean build with no errors.

**Step 4: Commit**

```
git add src/screens/GameScreen.tsx src/engine/SprintSimulator.ts
git commit -m "fix: stop GameLoop on sprint end and component unmount"
```

---

### Task 2: Preserve currentContract during review phase

**Files:**
- Modify: `src/stores/sprintStore.ts:45-49`

**Step 1: Stop nullifying contract in endSprint**

Change `endSprint` to keep the contract alive during review:

```ts
endSprint: () =>
  set({
    phase: 'review',
    // Don't null out currentContract -- review screen needs it
  }),
```

Move the contract cleanup into `collectPayout`:

```ts
collectPayout: (amount: number) =>
  set((state) => ({
    cashOnHand: state.cashOnHand + amount,
    phase: 'idle',
    currentContract: null,
    currentDay: 0,
  })),
```

**Step 2: Verify the app builds**

Run: `npx expo export --platform web`

**Step 3: Commit**

```
git add src/stores/sprintStore.ts
git commit -m "fix: preserve contract during review phase so HUD shows client name"
```

---

### Task 3: Add phase guard on startSprint

**Files:**
- Modify: `src/screens/GameScreen.tsx:41-54`

**Step 1: Add phase check in handleStartSprint**

```tsx
const handleStartSprint = useCallback(() => {
  // Guard: only start from idle phase
  if (useSprintStore.getState().phase !== 'idle') return;

  const contract = generateContract();
  useBoardStore.getState().addTickets(contract.tickets);
  useSprintStore.getState().startSprint(contract);
  resetSimState();
  GameLoop.start();
}, []);
```

**Step 2: Verify the app builds**

Run: `npx expo export --platform web`

**Step 3: Commit**

```
git add src/screens/GameScreen.tsx
git commit -m "fix: prevent double-tap starting sprint while already active"
```

---

### Task 4: Fix payout calculation to use story points instead of ticket count

**Files:**
- Modify: `src/engine/PayoutCalculator.ts:42-48`

**Step 1: Change to story-point-weighted completion ratio**

```ts
const storyTickets = tickets.filter((t) => t.type === 'story');
const totalPoints = storyTickets.reduce((sum, t) => sum + t.storyPoints, 0);
const completedPoints = storyTickets
  .filter((t) => t.status === 'done')
  .reduce((sum, t) => sum + t.storyPoints, 0);

const completionRatio = totalPoints > 0 ? completedPoints / totalPoints : 0;
```

Also update `SprintResult` to include point stats. In `src/types/sprint.types.ts`:

```ts
export interface SprintResult {
  ticketsCompleted: number;
  ticketsTotal: number;
  pointsCompleted: number;
  pointsTotal: number;
  blockersSmashed: number;
  cashEarned: number;
  bonusEarned: number;
  grade: SprintGrade;
}
```

Update `PayoutCalculator` return to include point stats:

```ts
return {
  ticketsCompleted: storyTickets.filter((t) => t.status === 'done').length,
  ticketsTotal: storyTickets.length,
  pointsCompleted: completedPoints,
  pointsTotal: totalPoints,
  blockersSmashed,
  cashEarned,
  bonusEarned,
  grade,
};
```

Update `SprintResultScreen.tsx` to show points completed stat row:

```tsx
<StatRow
  label="Story Points"
  value={`${result.pointsCompleted} / ${result.pointsTotal} pts`}
/>
```

**Step 2: Verify the app builds**

Run: `npx expo export --platform web`

**Step 3: Commit**

```
git add src/engine/PayoutCalculator.ts src/types/sprint.types.ts src/screens/SprintResultScreen.tsx
git commit -m "fix: base payout on story points completed, not ticket count"
```

---

### Task 5: Create a theme/colors system

**Files:**
- Create: `src/constants/theme.ts`
- Modify: All component and screen files (batch replace)

**Step 1: Create the theme constants file**

```ts
/**
 * Theme — Centralized color palette and spacing constants.
 *
 * All UI components should reference these values instead of
 * hardcoding hex colors. This enables future theming, dark/light
 * modes, and color-blind accessibility support.
 */

export const colors = {
  // Base backgrounds (darkest to lightest)
  bgPrimary: '#1a1a2e',    // Main app background, HUD
  bgSecondary: '#12122a',  // Kanban column background
  bgCard: '#16213e',       // Card/panel background
  bgTrack: '#2a2a4a',      // Progress bar tracks

  // Accent / brand
  accent: '#0f3460',       // Borders, badges, secondary elements
  danger: '#e94560',       // Blockers, destructive, urgent
  success: '#4ecca3',      // Done states, positive cash
  warning: '#e67e22',      // Doing column, mid-urgency
  info: '#3498db',         // Todo column, informational
  gold: '#ffd700',         // S-grade, perfect bonus, rewards
  yellow: '#f0c040',       // Mid-sprint timer

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#a0a0a0',
  textDark: '#1a1a2e',     // Dark text on light backgrounds

  // Blocker-specific
  blockerBg: '#8b0000',
  blockerGlow: '#e94560',

  // Overlay
  overlayBg: 'rgba(0, 0, 0, 0.75)',
} as const;

export const spacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
  round: 48,
} as const;
```

**Step 2: Replace hardcoded colors across all files**

Replace every hardcoded hex color with the corresponding `colors.X` reference. Import from `'../constants/theme'` in each file.

This is a batch operation -- hit every `.tsx` file in `src/components/` and `src/screens/`.

**Step 3: Verify the app builds**

Run: `npx expo export --platform web`

**Step 4: Commit**

```
git add src/constants/theme.ts src/components/ src/screens/
git commit -m "refactor: centralize colors into theme system"
```

---

## Wave 2: Game Feel

### Task 6: Communicate the "blocked" state visually

**Files:**
- Modify: `src/stores/boardStore.ts`
- Modify: `src/components/KanbanColumn.tsx`
- Modify: `src/components/KanbanBoard.tsx`

**Step 1: Add a derived `isBlocked` selector to boardStore**

Add a helper function (not in the store, but exported alongside it):

```ts
/** Selector: are there any active blockers halting work? */
export function selectIsBlocked(state: BoardState): boolean {
  return state.tickets.some(
    (t) => t.type === 'blocker' && t.status === 'doing',
  );
}
```

**Step 2: Show "BLOCKED" overlay on the Doing column when blocked**

In `KanbanColumn.tsx`, when `status === 'doing'` and there are active blockers, show a red pulsing "BLOCKED" banner at the top of the column (above the blockers).

In `KanbanBoard.tsx`, use the `selectIsBlocked` selector:

```tsx
const isBlocked = useBoardStore(selectIsBlocked);
```

Pass `isBlocked` down to the `doing` column.

**Step 3: Show a warning toast when a blocker spawns**

In `SprintSimulator.ts`, when a blocker is spawned (line 190), fire a toast:

```ts
useUIStore.getState().toast('Blocker! All work is frozen!');
```

**Step 4: Verify the app builds**

Run: `npx expo export --platform web`

**Step 5: Commit**

```
git add src/stores/boardStore.ts src/components/KanbanColumn.tsx src/components/KanbanBoard.tsx src/engine/SprintSimulator.ts
git commit -m "feat: show BLOCKED overlay and toast when blockers freeze work"
```

---

### Task 7: Build and render the Toast component

**Files:**
- Create: `src/components/Toast.tsx`
- Modify: `src/screens/GameScreen.tsx`

**Step 1: Create Toast component**

A floating notification bar that slides in from the top, shows for 2.5 seconds, then auto-dismisses. Uses `uiStore.toastMessage` and `uiStore.clearToast()`.

```tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { SlideInUp, SlideOutUp, FadeOut } from 'react-native-reanimated';
import { useUIStore } from '../stores/uiStore';
import { colors } from '../constants/theme';

const Toast: React.FC = () => {
  const { toastMessage, clearToast } = useUIStore();

  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => clearToast(), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);

  if (!toastMessage) return null;

  return (
    <Animated.View
      entering={SlideInUp.springify().damping(14)}
      exiting={FadeOut.duration(300)}
      style={styles.container}
    >
      <Text style={styles.text}>{toastMessage}</Text>
    </Animated.View>
  );
};
```

**Step 2: Render Toast in GameScreen**

Add `<Toast />` to `GameScreen.tsx` above the sprint result modal.

**Step 3: Verify the app builds**

Run: `npx expo export --platform web`

**Step 4: Commit**

```
git add src/components/Toast.tsx src/screens/GameScreen.tsx
git commit -m "feat: add Toast notification component for blocker warnings"
```

---

### Task 8: Add sprint number tracking and contextual idle text

**Files:**
- Modify: `src/stores/sprintStore.ts`
- Modify: `src/components/HUD.tsx`
- Modify: `src/screens/GameScreen.tsx`

**Step 1: Add sprintNumber to sprintStore**

```ts
// In SprintState interface:
sprintNumber: number;

// In initialState:
sprintNumber: 0,

// In startSprint:
startSprint: (contract) => set((state) => ({
  phase: 'active',
  currentDay: 1,
  totalDays: contract.sprintDays,
  currentContract: contract,
  sprintNumber: state.sprintNumber + 1,
})),
```

**Step 2: Show sprint number in HUD**

Change "Sprint" label to "Sprint #N" during active sprints.

**Step 3: Show contextual idle text**

In `GameScreen.tsx`, change the idle hint based on sprint number:
- Sprint 0: "Accept your first contract and start working!"
- Sprint 1+: "Ready for Sprint #{n+1}? | Cash: ${formatCash(cash)}"

**Step 4: Verify the app builds**

Run: `npx expo export --platform web`

**Step 5: Commit**

```
git add src/stores/sprintStore.ts src/components/HUD.tsx src/screens/GameScreen.tsx
git commit -m "feat: track sprint number for progression feel"
```

---

### Task 9: Improve sprint timer urgency + use interpolateColor

**Files:**
- Modify: `src/components/SprintTimer.tsx`

**Step 1: Replace discrete color steps with smooth interpolation**

Use `interpolateColor` (already imported) to smoothly transition the progress bar color from green -> yellow -> red.

**Step 2: Add pulsing animation in final 30% of sprint**

When `progress > 0.7`, add a pulsing opacity animation to the bar and the day text to create urgency.

**Step 3: Verify the app builds**

Run: `npx expo export --platform web`

**Step 4: Commit**

```
git add src/components/SprintTimer.tsx
git commit -m "feat: smooth color interpolation and urgency pulse on sprint timer"
```

---

### Task 10: Enhance SprintResultScreen with grade celebrations and better UX

**Files:**
- Modify: `src/screens/SprintResultScreen.tsx`

**Step 1: Add onRequestClose for Android back button**

```tsx
<Modal
  visible={showSprintResult}
  transparent
  animationType="fade"
  statusBarTranslucent
  onRequestClose={handleCollect}
>
```

**Step 2: Show points completed stat**

Add a `StatRow` for story points completed using the new `pointsCompleted` / `pointsTotal` fields from Task 4.

**Step 3: Adapt Collect button text for zero-payout sprints**

```tsx
<Text style={styles.collectButtonText}>
  {totalEarned > 0 ? 'Collect & Continue' : 'Try Again'}
</Text>
```

**Step 4: Add staggered stat reveal**

Use `Animated.View` with `FadeIn.delay(N)` for each stat row to reveal them sequentially.

**Step 5: Add exit animation**

Wrap the collect action in a brief fade-out before dismissing.

**Step 6: Verify the app builds**

Run: `npx expo export --platform web`

**Step 7: Commit**

```
git add src/screens/SprintResultScreen.tsx
git commit -m "feat: enhance result screen with staggered reveal, Android back, adaptive text"
```

---

### Task 11: Improve ticket progress display + completion feedback

**Files:**
- Modify: `src/components/TicketCard.tsx`

**Step 1: Round points display to whole numbers**

Change `ticket.pointsCompleted.toFixed(1)` to `Math.ceil(ticket.pointsCompleted)` for cleaner display.

**Step 2: Add completion checkmark animation**

When a ticket transitions to done, scale-bounce the checkmark.

**Step 3: Verify the app builds**

Run: `npx expo export --platform web`

**Step 4: Commit**

```
git add src/components/TicketCard.tsx
git commit -m "feat: round progress display and add completion animation"
```

---

### Task 12: Reframe velocity display for players

**Files:**
- Modify: `src/utils/format.utils.ts`
- Modify: `src/components/HUD.tsx`

**Step 1: Replace "pts/tick" with player-friendly label**

Change `formatVelocity` to show a qualitative label with the number:

```ts
export function formatVelocity(velocity: number): string {
  const ptsPerDay = velocity * TICKS_PER_DAY; // e.g., 0.5 * 8 = 4 pts/day
  return `${ptsPerDay.toFixed(0)} pts/day`;
}
```

Update HUD to show "Team Speed" instead of the raw velocity icon.

**Step 2: Verify the app builds**

Run: `npx expo export --platform web`

**Step 3: Commit**

```
git add src/utils/format.utils.ts src/components/HUD.tsx
git commit -m "feat: show velocity as pts/day instead of pts/tick"
```

---

## Wave 3: Visual Polish & Code Cleanup

### Task 13: Better empty states with gameplay hints

**Files:**
- Modify: `src/components/KanbanColumn.tsx`

**Step 1: Add instructive empty state messages**

```
todo empty (idle): "Start a sprint to get tickets!"
todo empty (active): "All tickets assigned!"
doing empty: "Tap 'Start Work' on a To Do ticket"
done empty: "Stories appear here when completed"
```

**Step 2: Verify the app builds**

Run: `npx expo export --platform web`

**Step 3: Commit**

```
git add src/components/KanbanColumn.tsx
git commit -m "feat: add instructive empty states to kanban columns"
```

---

### Task 14: Render DevAvatar in HUD and use SafeAreaView

**Files:**
- Modify: `src/components/HUD.tsx`
- Modify: `src/components/DevAvatar.tsx`

**Step 1: Add SafeAreaView or use Constants.statusBarHeight**

Replace the hardcoded `paddingTop: 48` with Expo's Constants:

```ts
import Constants from 'expo-constants';

// In styles:
paddingTop: Constants.statusBarHeight + 8,
```

**Step 2: Render a compact team roster in the HUD**

Show developer avatars in a small horizontal row near the velocity display. Import `DevAvatar` and render the team:

```tsx
const { developers, totalVelocity } = useTeamStore();
```

This connects the existing but unused `DevAvatar` component.

**Step 3: Verify the app builds**

Run: `npx expo export --platform web`

**Step 4: Commit**

```
git add src/components/HUD.tsx src/components/DevAvatar.tsx
git commit -m "feat: render team avatars in HUD and fix safe area padding"
```

---

### Task 15: Clean up dead code and lint issues

**Files:**
- Modify: `src/components/KanbanColumn.tsx` (remove unused `doneBlockers`)
- Modify: `src/components/SprintTimer.tsx` (remove unused `interpolateColor` import if used in Task 9, otherwise clean up)
- Modify: `src/screens/GameScreen.tsx` (remove dead `planning` phase check if not needed)

**Step 1: Remove dead code**

- `KanbanColumn.tsx`: Remove the `doneBlockers` variable (lines 42-44)
- `GameScreen.tsx`: If `planning` phase is still unused, remove it from the bottom bar condition

**Step 2: Verify the app builds**

Run: `npx expo export --platform web`

**Step 3: Commit**

```
git add -A
git commit -m "chore: remove dead code and unused variables"
```

---

### Task 16: Enhance blocker pulse animation

**Files:**
- Modify: `src/components/BlockerCard.tsx`

**Step 1: Increase pulse intensity**

Change pulse scale from `1.0-1.03` to `1.0-1.06` and opacity from `1.0-0.85` to `1.0-0.75` for more dramatic urgency.

**Step 2: Disable SMASH button visually when smashing**

When `smashing` is true, change the button style to greyed out.

**Step 3: Verify the app builds**

Run: `npx expo export --platform web`

**Step 4: Commit**

```
git add src/components/BlockerCard.tsx
git commit -m "feat: more dramatic blocker pulse and visual disabled state on smash"
```

---

### Task 17: Game balance tuning pass

**Files:**
- Modify: `src/constants/game.constants.ts`

**Step 1: Tune constants based on audit findings**

- `BLOCKER_SPAWN_CHANCE_PER_TICK`: Increase from `0.02` (2%) to `0.04` (4%) -- blockers should appear more often to create tension
- `TICK_INTERVAL_MS`: Consider reducing from `1000` to `800` -- slightly faster pace
- Add `D` grade between C and F for softer failure curve: D >= 20%, F < 20%

**Step 2: Update PayoutCalculator and SprintResultScreen for D grade**

Add `'D'` to `SprintGrade`, `GRADE_THRESHOLDS`, `GRADE_COLORS`, and `GRADE_LABELS`.

**Step 3: Verify the app builds**

Run: `npx expo export --platform web`

**Step 4: Commit**

```
git add src/constants/game.constants.ts src/engine/PayoutCalculator.ts src/types/sprint.types.ts src/screens/SprintResultScreen.tsx
git commit -m "balance: increase blocker rate, faster ticks, add D grade"
```

---

### Task 18: Final build verification and uncommitted WIP cleanup

**Step 1: Commit or incorporate the existing uncommitted changes**

The working tree has:
- `package.json` / `package-lock.json`: Dependency upgrades (react-dom, react-native-web, reanimated 4.1.1, gesture-handler 2.28.0)
- `src/components/BlockerCard.tsx`: Double-tap guard (smashing state)

These should be committed first, before Wave 1 begins.

**Step 2: Full web build**

Run: `npx expo export --platform web`
Expected: Clean build, zero errors.

**Step 3: Final commit**

```
git add -A
git commit -m "chore: finalize MVP polish pass"
```

---

## Execution Order

**Pre-flight:** Task 18's Step 1 (commit existing WIP changes)

**Wave 1 (Critical):** Tasks 1-5 (can be parallelized: 1+2+3 are independent, 4 depends on nothing, 5 depends on nothing)

**Wave 2 (Game Feel):** Tasks 6-12 (6+7 depend on each other, 8-12 are independent of each other but should follow Wave 1)

**Wave 3 (Polish):** Tasks 13-17 (all independent, can parallelize)

**Post-flight:** Task 18's Steps 2-3 (final verification)
