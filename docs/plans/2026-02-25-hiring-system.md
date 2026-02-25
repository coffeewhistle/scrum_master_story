# Hiring System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Team drawer accessible from the HUD at any time, showing the current roster and a Job Board with 3 random developer candidates that refresh each sprint, with a hard team size cap of 4.

**Architecture:** New `DeveloperArchetype` and updated `Developer` types feed a candidate generator in `SprintSimulator`. `teamStore` gains `candidates`, `maxTeamSize`, `hireDeveloper`, and `refreshCandidates`. A new `TeamDrawer` component (slide-up modal with Roster + Job Board tabs) is triggered by a 👥 button added to the HUD. Aura effects (QA reduces blocker rate, Scrum Master boosts velocity) are computed live in the simulator and store respectively.

**Tech Stack:** React Native, Reanimated 4 (slide animation), Zustand 5, TypeScript 5.9

---

## Task 1: Extend types — DeveloperArchetype, trait, and updated Developer

**Files:**
- Modify: `src/types/developer.types.ts`
- Modify: `src/types/index.ts` (re-exports — check if `DeveloperArchetype` needs adding)

**Step 1: Replace the contents of `src/types/developer.types.ts` with:**

```ts
/**
 * Developer types for the team management system.
 */

/** The five developer archetypes available for hire */
export type DeveloperArchetype = 'junior' | 'mid' | 'senior' | 'qa' | 'scrumMaster';

/**
 * Passive team-wide effect a developer provides.
 * Applied continuously while the developer is on the roster.
 */
export interface DeveloperTrait {
  /** Human-readable label shown in the Job Board card */
  label: string;
  /** Short description shown under the label */
  description: string;
  /**
   * Fractional reduction applied to BLOCKER_SPAWN_CHANCE_PER_TICK.
   * e.g. 0.25 means blockers spawn 25% less often.
   */
  blockerRateReduction?: number;
  /**
   * Multiplier applied to totalVelocity after summing all developer velocities.
   * e.g. 0.10 means +10% team velocity aura. Stacks additively per Scrum Master.
   */
  velocityAura?: number;
}

export interface Developer {
  /** Unique identifier (UUID) */
  id: string;
  /** Display name (e.g., "Alex the Intern") */
  name: string;
  /** Archetype determining base stats and available traits */
  archetype: DeveloperArchetype;
  /** Story points this developer completes per engine tick */
  velocity: number;
  /** Visual identifier — emoji */
  avatar: string;
  /** Optional passive aura effect applied while on the team */
  trait?: DeveloperTrait;
}
```

**Step 2: Check `src/types/index.ts` and add `DeveloperArchetype` and `DeveloperTrait` to re-exports if the file re-exports from `developer.types.ts`.**

**Step 3: Verify build**

```
npx expo export --platform web
```
Expected: clean build. The `Developer` type now has `archetype` — existing usages of `Developer` (in `teamStore.ts`) will get a TypeScript error on the `defaultDeveloper` object because it's missing `archetype`. That's intentional — we'll fix it in Task 2.

**Step 4: Commit**

```
git add src/types/
git commit -m "feat(types): add DeveloperArchetype, DeveloperTrait, extend Developer"
```

---

## Task 2: Update teamStore — candidates, maxTeamSize, hire, refresh, aura computation

**Files:**
- Modify: `src/stores/teamStore.ts`
- Modify: `src/constants/game.constants.ts`

**Step 1: Add `MAX_TEAM_SIZE` to `src/constants/game.constants.ts`**

Add at the bottom:

```ts
/** Maximum number of developers on the team (upgradeable in future) */
export const MAX_TEAM_SIZE = 4;
```

**Step 2: Rewrite `src/stores/teamStore.ts`**

```ts
import { create } from 'zustand';
import { Developer, DeveloperTrait } from '../types/developer.types';
import { BASE_DEVELOPER_VELOCITY, MAX_TEAM_SIZE } from '../constants/game.constants';

interface TeamState {
  // State
  developers: Developer[];
  totalVelocity: number;
  candidates: Developer[];
  maxTeamSize: number;

  // Actions
  /** Add a developer to the roster and recalculate velocity */
  addDeveloper: (dev: Developer) => void;
  /** Replace the current job board candidates */
  refreshCandidates: (candidates: Developer[]) => void;
  /** Hire a candidate: move from candidates → roster */
  hireDeveloper: (candidateId: string) => void;
  /** Recalculate totalVelocity from roster (call after trait changes) */
  updateVelocity: () => void;
}

/**
 * Compute effective total velocity:
 * sum of all dev velocities × (1 + sum of all velocityAura values)
 */
function computeTotalVelocity(developers: Developer[]): number {
  const baseVelocity = developers.reduce((sum, d) => sum + d.velocity, 0);
  const auraBoost = developers.reduce(
    (sum, d) => sum + (d.trait?.velocityAura ?? 0),
    0,
  );
  return baseVelocity * (1 + auraBoost);
}

const defaultDeveloper: Developer = {
  id: 'dev-001',
  name: 'Alex the Intern',
  archetype: 'junior',
  velocity: BASE_DEVELOPER_VELOCITY,
  avatar: '👨‍💻',
};

export const useTeamStore = create<TeamState>()((set, get) => ({
  developers: [defaultDeveloper],
  totalVelocity: computeTotalVelocity([defaultDeveloper]),
  candidates: [],
  maxTeamSize: MAX_TEAM_SIZE,

  addDeveloper: (dev: Developer) =>
    set((state) => {
      if (state.developers.length >= state.maxTeamSize) return state;
      const updatedDevs = [...state.developers, dev];
      return {
        developers: updatedDevs,
        totalVelocity: computeTotalVelocity(updatedDevs),
      };
    }),

  refreshCandidates: (candidates: Developer[]) =>
    set({ candidates }),

  hireDeveloper: (candidateId: string) =>
    set((state) => {
      if (state.developers.length >= state.maxTeamSize) return state;
      const candidate = state.candidates.find((c) => c.id === candidateId);
      if (!candidate) return state;
      const updatedDevs = [...state.developers, candidate];
      return {
        developers: updatedDevs,
        totalVelocity: computeTotalVelocity(updatedDevs),
        candidates: state.candidates.filter((c) => c.id !== candidateId),
      };
    }),

  updateVelocity: () =>
    set((state) => ({
      totalVelocity: computeTotalVelocity(state.developers),
    })),
}));
```

**Step 3: Verify build**

```
npx expo export --platform web
```
Expected: clean build.

**Step 4: Commit**

```
git add src/stores/teamStore.ts src/constants/game.constants.ts
git commit -m "feat(store): hiring system — candidates, maxTeamSize, hireDeveloper, velocity auras"
```

---

## Task 3: Candidate generator — archetypes, names, generateCandidates()

**Files:**
- Create: `src/constants/developer.constants.ts`
- Modify: `src/engine/SprintSimulator.ts`

**Step 1: Create `src/constants/developer.constants.ts`**

```ts
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
 * The 5 archetypes available for the job board.
 * Junior appears more frequently (weighted pool).
 */
export const CANDIDATE_ARCHETYPE_POOL: DeveloperArchetype[] = [
  'junior', 'junior', 'mid', 'mid', 'senior', 'qa', 'scrumMaster',
];
```

**Step 2: Add `generateCandidates()` to `src/engine/SprintSimulator.ts`**

Add imports at the top of the file (after existing imports):

```ts
import type { DeveloperArchetype } from '../types/developer.types';
import {
  DEVELOPER_NAMES,
  DEVELOPER_AVATARS,
  ARCHETYPE_VELOCITY_RANGE,
  ARCHETYPE_COST_RANGE,
  ARCHETYPE_TRAITS,
  CANDIDATE_ARCHETYPE_POOL,
} from '../constants/developer.constants';
import { useTeamStore } from '../stores/teamStore';
```

Note: `useTeamStore` is already imported — don't duplicate it.

Add `hireCost` to the `Developer` interface temporarily — actually, `hireCost` is not on `Developer`, it's only needed in the UI. Add it to a new `Candidate` type, OR simply store it on `Developer` as an optional field. **Use an optional field for simplicity:**

In `src/types/developer.types.ts`, add to `Developer`:
```ts
  /** Cost in cash to hire this developer (only set on candidates, not roster members) */
  hireCost?: number;
```

Then add this function to `SprintSimulator.ts`, after `resetSimState`:

```ts
/**
 * Generate 3 random job board candidates.
 * Called at the start of each sprint (inside resetSimState).
 */
function generateCandidates(): void {
  const usedNames = new Set(
    useTeamStore.getState().developers.map((d) => d.name),
  );

  const candidates = [];
  const usedArchetypes: DeveloperArchetype[] = [];

  for (let i = 0; i < 3; i++) {
    // Pick a random archetype from the weighted pool
    // Avoid picking the same archetype twice in one board
    let archetype: DeveloperArchetype;
    let attempts = 0;
    do {
      archetype = randomPick([...CANDIDATE_ARCHETYPE_POOL]) as DeveloperArchetype;
      attempts++;
    } while (usedArchetypes.includes(archetype) && attempts < 10);
    usedArchetypes.push(archetype);

    // Pick a unique name
    const namePool = DEVELOPER_NAMES[archetype].filter((n) => !usedNames.has(n));
    const name = namePool.length > 0
      ? randomPick(namePool)
      : randomPick(DEVELOPER_NAMES[archetype]);
    usedNames.add(name);

    const [vMin, vMax] = ARCHETYPE_VELOCITY_RANGE[archetype];
    const [cMin, cMax] = ARCHETYPE_COST_RANGE[archetype];

    candidates.push({
      id: uuid(),
      name,
      archetype,
      velocity: Math.round((vMin + Math.random() * (vMax - vMin)) * 10) / 10,
      avatar: DEVELOPER_AVATARS[archetype],
      trait: ARCHETYPE_TRAITS[archetype],
      hireCost: randomInt(cMin, cMax),
    });
  }

  useTeamStore.getState().refreshCandidates(candidates);
}
```

**Step 3: Call `generateCandidates()` inside `resetSimState()`**

```ts
export function resetSimState(): void {
  ticksThisDay = 0;
  blockersSmashed = 0;
  useUIStore.getState().setCanShipEarly(false);
  generateCandidates(); // Refresh job board each sprint
}
```

**Step 4: Apply QA blocker rate reduction in the tick**

In `tick()`, replace the hardcoded `BLOCKER_SPAWN_CHANCE_PER_TICK` roll with an effective rate that accounts for QA engineers on the team:

```ts
  // ── 4. Roll for blocker spawn ────────────────────────────────────────────
  const latestTickets = useBoardStore.getState().tickets;
  const currentActiveBlockers = latestTickets.filter(
    (t) => t.type === 'blocker' && t.status === 'doing',
  ).length;
  const hasIncompleteWork = latestTickets.some(
    (t) => t.type === 'story' && t.status !== 'done',
  );

  // QA engineers reduce blocker spawn rate
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
```

Replace `rollChance(BLOCKER_SPAWN_CHANCE_PER_TICK)` with `rollChance(effectiveBlockerRate)`.

**Step 5: Verify build**

```
npx expo export --platform web
```
Expected: clean build.

**Step 6: Commit**

```
git add src/constants/developer.constants.ts src/engine/SprintSimulator.ts src/types/developer.types.ts
git commit -m "feat(engine): candidate generator, QA blocker reduction, archetype constants"
```

---

## Task 4: TeamDrawer component — Roster and Job Board tabs

**Files:**
- Create: `src/components/TeamDrawer.tsx`

**Step 1: Create `src/components/TeamDrawer.tsx`**

This is a slide-up modal with two tabs: Roster and Job Board. Uses Reanimated for the slide animation.

```tsx
/**
 * TeamDrawer — Slide-up panel for viewing the roster and hiring new developers.
 *
 * Two tabs:
 *   Roster    — lists current developers with archetype badge and velocity
 *   Job Board — 3 random candidates per sprint; hire buttons disabled mid-sprint
 *
 * Dismisses by tapping the backdrop or the close button.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useTeamStore } from '../stores/teamStore';
import { useSprintStore } from '../stores/sprintStore';
import { colors } from '../constants/theme';
import { formatCash } from '../utils/format.utils';
import { ARCHETYPE_LABELS } from '../constants/developer.constants';
import type { Developer } from '../types';

interface TeamDrawerProps {
  visible: boolean;
  onClose: () => void;
}

type Tab = 'roster' | 'jobBoard';

const TeamDrawer: React.FC<TeamDrawerProps> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('roster');
  const { developers, candidates, maxTeamSize, hireDeveloper } = useTeamStore();
  const { cashOnHand, phase, collectPayout } = useSprintStore();
  // We use collectPayout with 0 to deduct (negative spend) — actually we need
  // a spend action. Use sprintStore's cashOnHand and a dedicated spend action.
  // See Task 5 for adding spendCash to sprintStore.
  const spendCash = useSprintStore((s) => s.spendCash);

  const isActiveSprint = phase === 'active';
  const teamFull = developers.length >= maxTeamSize;

  const handleHire = (candidate: Developer) => {
    if (isActiveSprint || teamFull) return;
    const cost = candidate.hireCost ?? 0;
    if (cashOnHand < cost) return;
    spendCash(cost);
    hireDeveloper(candidate.id);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Drawer panel */}
      <Animated.View
        entering={SlideInDown.springify().damping(18).stiffness(200)}
        exiting={SlideOutDown.springify().damping(18).stiffness(200)}
        style={styles.drawer}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>👥 Team</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'roster' && styles.tabActive]}
            onPress={() => setActiveTab('roster')}
          >
            <Text style={[styles.tabText, activeTab === 'roster' && styles.tabTextActive]}>
              Roster ({developers.length}/{maxTeamSize})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'jobBoard' && styles.tabActive]}
            onPress={() => setActiveTab('jobBoard')}
          >
            <Text style={[styles.tabText, activeTab === 'jobBoard' && styles.tabTextActive]}>
              Job Board
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {activeTab === 'roster' ? (
            <>
              {developers.map((dev) => (
                <RosterCard key={dev.id} developer={dev} />
              ))}
              {teamFull && (
                <Text style={styles.teamFullNote}>
                  Team is full. Upgrade your office to hire more developers.
                </Text>
              )}
            </>
          ) : (
            <>
              {isActiveSprint && (
                <Text style={styles.sprintActiveNote}>
                  Hiring is available between sprints.
                </Text>
              )}
              {candidates.length === 0 ? (
                <Text style={styles.emptyNote}>
                  No candidates yet. Start a sprint to refresh the job board.
                </Text>
              ) : (
                candidates.map((candidate) => {
                  const cost = candidate.hireCost ?? 0;
                  const canAfford = cashOnHand >= cost;
                  const disabled = isActiveSprint || teamFull || !canAfford;

                  return (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      canAfford={canAfford}
                      disabled={disabled}
                      disabledReason={
                        isActiveSprint ? 'Sprint in progress' :
                        teamFull ? 'Team full' :
                        !canAfford ? `Need ${formatCash(cost - cashOnHand)} more` :
                        undefined
                      }
                      onHire={() => handleHire(candidate)}
                    />
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface RosterCardProps {
  developer: Developer;
}

const RosterCard: React.FC<RosterCardProps> = ({ developer }) => (
  <View style={styles.card}>
    <Text style={styles.cardAvatar}>{developer.avatar}</Text>
    <View style={styles.cardInfo}>
      <Text style={styles.cardName}>{developer.name}</Text>
      <View style={styles.cardBadgeRow}>
        <View style={styles.archetypeBadge}>
          <Text style={styles.archetypeBadgeText}>
            {ARCHETYPE_LABELS[developer.archetype]}
          </Text>
        </View>
        {developer.trait && (
          <View style={styles.traitBadge}>
            <Text style={styles.traitBadgeText}>{developer.trait.label}</Text>
          </View>
        )}
      </View>
      {developer.trait && (
        <Text style={styles.traitDesc}>{developer.trait.description}</Text>
      )}
    </View>
    <Text style={styles.cardVelocity}>
      {developer.velocity.toFixed(1)}{'\n'}
      <Text style={styles.cardVelocityLabel}>pts/tick</Text>
    </Text>
  </View>
);

interface CandidateCardProps {
  candidate: Developer;
  canAfford: boolean;
  disabled: boolean;
  disabledReason?: string;
  onHire: () => void;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  canAfford,
  disabled,
  disabledReason,
  onHire,
}) => (
  <View style={styles.card}>
    <Text style={styles.cardAvatar}>{candidate.avatar}</Text>
    <View style={styles.cardInfo}>
      <Text style={styles.cardName}>{candidate.name}</Text>
      <View style={styles.cardBadgeRow}>
        <View style={styles.archetypeBadge}>
          <Text style={styles.archetypeBadgeText}>
            {ARCHETYPE_LABELS[candidate.archetype]}
          </Text>
        </View>
        {candidate.trait && (
          <View style={styles.traitBadge}>
            <Text style={styles.traitBadgeText}>{candidate.trait.label}</Text>
          </View>
        )}
      </View>
      {candidate.trait && (
        <Text style={styles.traitDesc}>{candidate.trait.description}</Text>
      )}
      {disabledReason && (
        <Text style={styles.disabledReason}>{disabledReason}</Text>
      )}
    </View>
    <View style={styles.cardRight}>
      <Text style={[styles.hireCost, !canAfford && styles.hireCostCantAfford]}>
        {formatCash(candidate.hireCost ?? 0)}
      </Text>
      <TouchableOpacity
        style={[styles.hireBtn, disabled && styles.hireBtnDisabled]}
        onPress={onHire}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.hireBtnText}>Hire</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayBg,
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: 18,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.bgSecondary,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    marginTop: 12,
  },
  contentInner: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  cardAvatar: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  archetypeBadge: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  archetypeBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  traitBadge: {
    backgroundColor: colors.gold + '33', // gold with 20% opacity
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  traitBadgeText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '700',
  },
  traitDesc: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
  },
  disabledReason: {
    color: colors.danger,
    fontSize: 10,
    marginTop: 4,
  },
  cardVelocity: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardVelocityLabel: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '400',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  hireCost: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
  },
  hireCostCantAfford: {
    color: colors.danger,
  },
  hireBtn: {
    backgroundColor: colors.success,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  hireBtnDisabled: {
    backgroundColor: colors.bgTrack,
  },
  hireBtnText: {
    color: colors.textDark,
    fontSize: 12,
    fontWeight: '900',
  },
  teamFullNote: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
  sprintActiveNote: {
    color: colors.warning,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 8,
    fontStyle: 'italic',
  },
  emptyNote: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
});

export default TeamDrawer;
```

**Step 2: Verify build**

```
npx expo export --platform web
```
This will fail because `spendCash` doesn't exist on `sprintStore` yet. That's expected — fix in Task 5.

---

## Task 5: Add spendCash action to sprintStore

**Files:**
- Modify: `src/stores/sprintStore.ts`

**Step 1: Add `spendCash` to the store interface and implementation**

Read the current file, then add:

```ts
// In SprintState interface:
spendCash: (amount: number) => void;

// In the store implementation:
spendCash: (amount: number) =>
  set((state) => ({
    cashOnHand: Math.max(0, state.cashOnHand - amount),
  })),
```

**Step 2: Verify build**

```
npx expo export --platform web
```
Expected: clean build. The `TeamDrawer` should now compile fully.

**Step 3: Commit Tasks 4+5 together**

```
git add src/components/TeamDrawer.tsx src/stores/sprintStore.ts
git commit -m "feat: TeamDrawer with Roster/Job Board tabs, spendCash action"
```

---

## Task 6: Wire TeamDrawer into HUD and GameScreen

**Files:**
- Modify: `src/components/HUD.tsx`
- Modify: `src/screens/GameScreen.tsx`

**Step 1: Add `onTeamPress` prop to HUD and a 👥 button**

In `src/components/HUD.tsx`:

Add `onTeamPress: () => void` to the component props:

```tsx
interface HUDProps {
  onTeamPress: () => void;
}

const HUD: React.FC<HUDProps> = ({ onTeamPress }) => {
```

Add a touchable team button to the right side of the `velocityRow`, replacing or sitting to the right of the existing velocity display:

```tsx
{/* Velocity bar + team button */}
<View style={styles.velocityRow}>
  <TouchableOpacity onPress={onTeamPress} style={styles.teamBtn}>
    <View style={styles.teamAvatars}>
      {developers.map((dev) => (
        <Text key={dev.id} style={styles.avatarEmoji}>{dev.avatar}</Text>
      ))}
    </View>
    <Text style={styles.teamBtnLabel}>👥 Team</Text>
  </TouchableOpacity>
  <View style={styles.velocityDisplay}>
    <Text style={styles.velocityLabel}>Team Speed</Text>
    <Text style={styles.velocityText}>{formatVelocity(totalVelocity)}</Text>
  </View>
</View>
```

Add import for `TouchableOpacity` from `react-native`.

Add styles:
```ts
teamBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.accent,
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 4,
  marginRight: 'auto',
},
teamBtnLabel: {
  color: colors.textPrimary,
  fontSize: 11,
  fontWeight: '700',
  marginLeft: 4,
},
velocityDisplay: {
  alignItems: 'flex-end',
},
```

Remove the old `velocityRow` flex layout styles that had `justifyContent: 'center'` and adjust to `justifyContent: 'space-between'`.

**Step 2: Wire in GameScreen**

In `src/screens/GameScreen.tsx`:

Add state for drawer visibility:
```tsx
const [teamDrawerOpen, setTeamDrawerOpen] = React.useState(false);
```

Import `TeamDrawer`:
```tsx
import TeamDrawer from '../components/TeamDrawer';
```

Pass `onTeamPress` to `<HUD />`:
```tsx
<HUD onTeamPress={() => setTeamDrawerOpen(true)} />
```

Add `<TeamDrawer />` below the `<Toast />`:
```tsx
<TeamDrawer
  visible={teamDrawerOpen}
  onClose={() => setTeamDrawerOpen(false)}
/>
```

**Step 3: Verify build**

```
npx expo export --platform web
```
Expected: clean build.

**Step 4: Commit**

```
git add src/components/HUD.tsx src/screens/GameScreen.tsx
git commit -m "feat: wire TeamDrawer — 👥 Team button in HUD, drawer in GameScreen"
```

---

## Task 7: Generate initial candidates on first load

**Files:**
- Modify: `src/screens/GameScreen.tsx`

**Problem:** `generateCandidates()` is called inside `resetSimState()`, which only runs when a sprint starts. On first load, the Job Board is empty. Fix: call `generateCandidates()` once on mount.

**Step 1: Export `generateCandidates` from SprintSimulator**

In `src/engine/SprintSimulator.ts`, change `function generateCandidates()` to `export function generateCandidates()`.

**Step 2: Call it on mount in GameScreen**

```tsx
import { generateContract, resetSimState, shipEarly, generateCandidates } from '../engine/SprintSimulator';

// Inside the component, in the existing useEffect:
useEffect(() => {
  generateCandidates(); // Populate job board on first load
  return () => {
    GameLoop.stop();
  };
}, []);
```

**Step 3: Verify build**

```
npx expo export --platform web
```
Expected: clean build.

**Step 4: Commit**

```
git add src/screens/GameScreen.tsx src/engine/SprintSimulator.ts
git commit -m "feat: populate job board candidates on first load"
```

---

## Task 8: Final integration smoke test and cleanup

**Files:**
- Verify: all modified files
- Verify: `npx expo export --platform web`

**Step 1: Full build verification**

```
npx expo export --platform web
```
Expected: clean build, no TypeScript errors, no warnings about unused imports.

**Step 2: Manual smoke test checklist**

Play through the following:
1. Open the app → tap 👥 Team → Job Board tab should show 3 candidates
2. All hire buttons should be enabled (no active sprint, cash = $0 so some may be greyed out as unaffordable)
3. Start a sprint → open Team drawer → hire buttons show "Sprint in progress"
4. Complete a sprint, collect payout → open Team drawer → hire a Junior Dev (cheapest, should be affordable)
5. Verify new developer's emoji appears in the HUD avatar row
6. Verify `totalVelocity` in HUD increases
7. Start another sprint → observe slightly faster ticket progress (higher team velocity)
8. If QA hired: observe fewer blockers over multiple sprints
9. Verify team full message at 4 developers

**Step 3: Commit any cleanup**

```
git add -A
git commit -m "chore: hiring system smoke test cleanup"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `developer.types.ts` | Add `DeveloperArchetype`, `DeveloperTrait`, extend `Developer` |
| 2 | `teamStore.ts`, `game.constants.ts` | candidates, maxTeamSize, hireDeveloper, velocity aura |
| 3 | `developer.constants.ts`, `SprintSimulator.ts` | candidate generator, QA trait effect |
| 4 | `TeamDrawer.tsx` | Slide-up drawer with Roster + Job Board tabs |
| 5 | `sprintStore.ts` | `spendCash` action |
| 6 | `HUD.tsx`, `GameScreen.tsx` | Wire 👥 button and drawer |
| 7 | `GameScreen.tsx`, `SprintSimulator.ts` | Populate candidates on first load |
| 8 | — | Smoke test and cleanup |
