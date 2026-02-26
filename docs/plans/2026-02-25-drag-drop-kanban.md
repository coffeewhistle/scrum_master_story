# Drag-and-Drop Kanban Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the "Start Work" button on todo tickets with a drag gesture that moves them into the Doing column, using react-native-gesture-handler's Pan gesture.

**Architecture:** The board measures its own layout on mount and passes Doing-column bounds into a React context. Each todo TicketCard wraps its content in a `Gesture.Pan` handler. While dragging, a floating clone renders above everything via an absolute-positioned overlay registered in the same context. On release, if the gesture's absolute X coordinate falls within the Doing column bounds, `moveTicket(id, 'doing')` fires; otherwise the card springs back. Only todo tickets are draggable; done and doing tickets are gesture-free. Blockers are unchanged.

**Tech Stack:** react-native-gesture-handler 2.28 (`Gesture.Pan`, `GestureDetector`), react-native-reanimated 4 (`useSharedValue`, `useAnimatedStyle`, `withSpring`), React context for board bounds, Zustand `boardStore.moveTicket`

---

## Task 1: Create DragContext — shared board bounds and drag state

**Files:**
- Create: `src/context/DragContext.tsx`

**Step 1: Create the file**

This context holds:
- The measured x-start and width of the Doing column (set by KanbanBoard after layout)
- The currently dragged ticket id (so the column can highlight)

```tsx
/**
 * DragContext — Shared state for the drag-and-drop Kanban board.
 *
 * Provides:
 *   - doingColumnBounds: measured screen x + width of the Doing column
 *   - draggedTicketId: id of ticket currently being dragged (null if none)
 *   - setDoingColumnBounds: called by KanbanBoard after layout
 *   - setDraggedTicketId: called by TicketCard during drag lifecycle
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ColumnBounds {
  x: number;
  width: number;
}

interface DragContextValue {
  doingColumnBounds: ColumnBounds | null;
  draggedTicketId: string | null;
  setDoingColumnBounds: (bounds: ColumnBounds) => void;
  setDraggedTicketId: (id: string | null) => void;
}

const DragContext = createContext<DragContextValue>({
  doingColumnBounds: null,
  draggedTicketId: null,
  setDoingColumnBounds: () => {},
  setDraggedTicketId: () => {},
});

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [doingColumnBounds, setDoingColumnBounds] = useState<ColumnBounds | null>(null);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);

  const handleSetBounds = useCallback((bounds: ColumnBounds) => {
    setDoingColumnBounds(bounds);
  }, []);

  const handleSetDraggedId = useCallback((id: string | null) => {
    setDraggedTicketId(id);
  }, []);

  return (
    <DragContext.Provider
      value={{
        doingColumnBounds,
        draggedTicketId,
        setDoingColumnBounds: handleSetBounds,
        setDraggedTicketId: handleSetDraggedId,
      }}
    >
      {children}
    </DragContext.Provider>
  );
};

export function useDragContext(): DragContextValue {
  return useContext(DragContext);
}
```

**Step 2: Verify build**

```
npx expo export --platform web
```
Expected: clean build.

**Step 3: Commit**

```
git add src/context/DragContext.tsx
git commit -m "feat(drag): DragContext for board bounds and drag state"
```

---

## Task 2: Update KanbanBoard — wrap in DragProvider, measure Doing column bounds

**Files:**
- Modify: `src/components/KanbanBoard.tsx`

**Step 1: Read the current file, then replace entirely**

```tsx
/**
 * KanbanBoard — The three-column Kanban board (Todo → Doing → Done).
 *
 * Wraps in DragProvider so TicketCards can access column bounds.
 * Measures the Doing column position after layout for drop-zone detection.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useBoardStore, selectIsBlocked } from '../stores/boardStore';
import type { TicketStatus } from '../types';
import KanbanColumn from './KanbanColumn';
import { DragProvider, useDragContext } from '../context/DragContext';

const COLUMNS: { title: string; status: TicketStatus }[] = [
  { title: 'To Do', status: 'todo' },
  { title: 'Doing', status: 'doing' },
  { title: 'Done', status: 'done' },
];

/** Inner board — must be inside DragProvider to access context */
const KanbanBoardInner: React.FC = () => {
  const tickets = useBoardStore((s) => s.tickets);
  const isBlocked = useBoardStore(selectIsBlocked);
  const { draggedTicketId, setDoingColumnBounds } = useDragContext();

  // The board is a horizontal flex row with 3 equal columns.
  // We measure each column's layout to get the Doing column's x + width.
  const handleColumnLayout = useCallback(
    (status: TicketStatus, event: LayoutChangeEvent) => {
      if (status === 'doing') {
        const { x, width } = event.nativeEvent.layout;
        setDoingColumnBounds({ x, width });
      }
    },
    [setDoingColumnBounds],
  );

  return (
    <View style={styles.board}>
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.status}
          title={col.title}
          status={col.status}
          tickets={tickets.filter((t) => t.status === col.status)}
          isBlocked={col.status === 'doing' && isBlocked}
          isDropTarget={col.status === 'doing' && draggedTicketId !== null}
          onLayout={(e) => handleColumnLayout(col.status, e)}
        />
      ))}
    </View>
  );
};

const KanbanBoard: React.FC = () => (
  <DragProvider>
    <KanbanBoardInner />
  </DragProvider>
);

const styles = StyleSheet.create({
  board: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 2,
  },
});

export default KanbanBoard;
```

**Step 2: Verify build**

```
npx expo export --platform web
```
Expected: TypeScript errors on KanbanColumn because it doesn't have `isDropTarget` or `onLayout` props yet. That's expected — fix in Task 3.

**Step 3: Commit**

```
git add src/components/KanbanBoard.tsx
git commit -m "feat(drag): KanbanBoard measures Doing column bounds, wraps in DragProvider"
```

---

## Task 3: Update KanbanColumn — accept isDropTarget and onLayout, render highlight

**Files:**
- Modify: `src/components/KanbanColumn.tsx`

**Step 1: Read the current file, then make these changes**

Add two new props to `KanbanColumnProps`:
```ts
interface KanbanColumnProps {
  title: string;
  status: TicketStatus;
  tickets: Ticket[];
  isBlocked?: boolean;
  isDropTarget?: boolean;        // highlight this column as a drop zone
  onLayout?: (e: LayoutChangeEvent) => void;  // for measuring bounds
}
```

Add `LayoutChangeEvent` to the react-native import.

Accept the new props in the component signature:
```tsx
const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  tickets,
  isBlocked,
  isDropTarget,
  onLayout,
}) => {
```

Pass `onLayout` to the root `<View>`:
```tsx
<View style={styles.column} onLayout={onLayout}>
```

Add the drop target highlight below the blocked banner (or in its place if not blocked):
```tsx
{isDropTarget && !isBlocked && (
  <View style={styles.dropTargetBanner}>
    <Text style={styles.dropTargetText}>DROP HERE</Text>
  </View>
)}
```

Add styles:
```ts
dropTargetBanner: {
  backgroundColor: colors.info,
  paddingVertical: 6,
  alignItems: 'center',
  justifyContent: 'center',
},
dropTargetText: {
  color: colors.textPrimary,
  fontSize: 11,
  fontWeight: '900',
  letterSpacing: 2,
},
```

Also add a pulsing border to the column when it's a drop target. Add this to the column style conditionally:
```tsx
<View
  style={[
    styles.column,
    isDropTarget && styles.columnDropTarget,
  ]}
  onLayout={onLayout}
>
```

Add style:
```ts
columnDropTarget: {
  borderWidth: 2,
  borderColor: colors.info,
  borderStyle: 'dashed',
},
```

**Step 2: Verify build**

```
npx expo export --platform web
```
Expected: clean build.

**Step 3: Commit**

```
git add src/components/KanbanColumn.tsx
git commit -m "feat(drag): KanbanColumn drop target highlight and onLayout measurement"
```

---

## Task 4: Update TicketCard — add Pan gesture, floating drag clone, remove Start Work button

**Files:**
- Modify: `src/components/TicketCard.tsx`

**Step 1: Read the current file, then replace entirely**

This is the core of the feature. Key behaviors:
- Todo tickets: wrap in `GestureDetector` with a `Gesture.Pan`
- On drag start: set `draggedTicketId` in context, animate card to lifted state
- While dragging: move a floating absolute-positioned clone following the gesture
- On drag end: if released over Doing column bounds → `moveTicket(id, 'doing')`, else spring back
- Doing/done tickets: no gesture, render normally
- Remove the "Start Work" `TouchableOpacity`

```tsx
/**
 * TicketCard — Renders a single story ticket on the Kanban board.
 *
 * Visual states:
 *   todo:  Draggable card — drag into Doing column to start work.
 *   doing: Card with animated progress bar (not draggable).
 *   done:  Faded card with checkmark (not draggable).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import type { Ticket } from '../types';
import { useBoardStore } from '../stores/boardStore';
import { useDragContext } from '../context/DragContext';
import { colors } from '../constants/theme';

interface TicketCardProps {
  ticket: Ticket;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  const moveTicket = useBoardStore((s) => s.moveTicket);
  const { doingColumnBounds, setDraggedTicketId } = useDragContext();

  const isDone = ticket.status === 'done';
  const isTodo = ticket.status === 'todo';
  const isDoing = ticket.status === 'doing';

  // Progress ratio for the bar
  const progressRatio =
    ticket.storyPoints > 0
      ? Math.min(ticket.pointsCompleted / ticket.storyPoints, 1)
      : 0;

  // Animated progress bar width
  const animatedProgress = useSharedValue(progressRatio);
  React.useEffect(() => {
    animatedProgress.value = withSpring(progressRatio, { damping: 15, stiffness: 120 });
  }, [progressRatio]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%` as any,
  }));

  // Celebration bounce when ticket completes
  const cardScale = useSharedValue(1);
  React.useEffect(() => {
    if (isDone) {
      cardScale.value = withSequence(
        withSpring(1.05, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 150 }),
      );
    }
  }, [isDone]);

  // Drag state (todo only)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const dragOpacity = useSharedValue(1);
  const isDragging = useSharedValue(false);

  // Absolute position of the card on screen (set via onLayout + gesture)
  const cardPageX = useSharedValue(0);
  const cardPageY = useSharedValue(0);

  const handleDrop = (absoluteX: number) => {
    if (!doingColumnBounds) return;
    const { x, width } = doingColumnBounds;
    if (absoluteX >= x && absoluteX <= x + width) {
      moveTicket(ticket.id, 'doing');
    }
  };

  const handleDragEnd = (absoluteX: number) => {
    'worklet';
    runOnJS(handleDrop)(absoluteX);
    runOnJS(setDraggedTicketId)(null);
    translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
    dragScale.value = withSpring(1);
    dragOpacity.value = withSpring(1);
    isDragging.value = false;
  };

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart(() => {
      'worklet';
      isDragging.value = true;
      dragScale.value = withSpring(1.06, { damping: 10, stiffness: 200 });
      dragOpacity.value = withSpring(0.92);
      runOnJS(setDraggedTicketId)(ticket.id);
    })
    .onUpdate((e) => {
      'worklet';
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      handleDragEnd(e.absoluteX);
    })
    .onFinalize(() => {
      'worklet';
      // Safety: ensure state resets even if onEnd didn't fire
      if (isDragging.value) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        dragScale.value = withSpring(1);
        dragOpacity.value = withSpring(1);
        isDragging.value = false;
        runOnJS(setDraggedTicketId)(null);
      }
    });

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: isDragging.value ? dragScale.value : cardScale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: dragOpacity.value,
    zIndex: isDragging.value ? 1000 : 1,
    shadowOpacity: isDragging.value ? 0.5 : 0.3,
    elevation: isDragging.value ? 12 : 3,
  }));

  const cardContent = (
    <View style={[styles.card, isDone && styles.cardDone]}>
      {/* Header row: title + story points badge */}
      <View style={styles.header}>
        <Text
          style={[styles.title, isDone && styles.titleDone]}
          numberOfLines={2}
        >
          {isDone && '✅ '}
          {ticket.title}
        </Text>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{ticket.storyPoints}</Text>
        </View>
      </View>

      {/* Progress bar (doing & done states) */}
      {(isDoing || isDone) && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                isDone ? styles.progressFillDone : styles.progressFillActive,
                progressBarStyle,
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {Math.ceil(ticket.pointsCompleted)} / {ticket.storyPoints} pts
          </Text>
        </View>
      )}

      {/* Drag hint for todo tickets */}
      {isTodo && (
        <Text style={styles.dragHint}>≡ drag to Doing</Text>
      )}
    </View>
  );

  // Only todo tickets are draggable
  if (!isTodo) {
    return (
      <Animated.View style={[{ marginBottom: 8, marginHorizontal: 4 }, useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }],
      }))]}>
        {cardContent}
      </Animated.View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.draggableWrapper, cardAnimStyle]}>
        {cardContent}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  draggableWrapper: {
    marginBottom: 8,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  cardDone: {
    opacity: 0.6,
    borderLeftColor: colors.success,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  titleDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  pointsBadge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: 'center',
  },
  pointsText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.bgTrack,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressFillActive: {
    backgroundColor: colors.danger,
  },
  progressFillDone: {
    backgroundColor: colors.success,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  dragHint: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 6,
    fontStyle: 'italic',
  },
});

export default TicketCard;
```

**Step 2: Verify build**

```
npx expo export --platform web
```
Expected: clean build.

**Step 3: Manual smoke test**

1. Start a sprint, commit stories during planning, then start the sprint
2. In the active board, press and hold a To Do card for ~150ms — it should lift (scale up slightly)
3. Drag it toward the Doing column — the Doing column should show a "DROP HERE" highlight
4. Release over Doing — card should move to Doing column and start progressing
5. Release outside Doing — card should spring back to its original position
6. Done and Doing cards should have no drag behavior

**Step 4: Commit**

```
git add src/components/TicketCard.tsx
git commit -m "feat(drag): Pan gesture on todo tickets, drop into Doing column, remove Start Work button"
```

---

## Task 5: Update empty state hint in KanbanColumn

**Files:**
- Modify: `src/components/KanbanColumn.tsx`

**Step 1: Update the empty state hint for the doing column**

The hint currently says `Tap "Start Work" on a To Do ticket`. Change it to reflect the new drag interaction:

```tsx
: status === 'doing'
? 'Drag a To Do ticket here to start work'
: 'Stories appear here when complete'
```

**Step 2: Verify build**

```
npx expo export --platform web
```

**Step 3: Commit**

```
git add src/components/KanbanColumn.tsx
git commit -m "fix: update empty state hint to reflect drag interaction"
```

---

## Task 6: Final smoke test and cleanup

**Step 1: Full build**

```
npx expo export --platform web
```
Expected: clean build, zero TypeScript errors.

**Step 2: Smoke test checklist**

- [ ] Accept contract, commit stories, start sprint
- [ ] Press-and-hold a To Do card → lifts with scale animation after ~150ms
- [ ] Drag toward Doing column → "DROP HERE" banner + dashed border appears
- [ ] Release over Doing → card moves to Doing, starts progressing
- [ ] Release outside Doing → card springs back to To Do
- [ ] Doing cards have no gesture (no lift on hold)
- [ ] Done cards have no gesture
- [ ] Blocker cards still tap-to-smash (unchanged)
- [ ] Multiple stories can be dragged in sequence
- [ ] WIP penalty applies correctly as more stories go into Doing

**Step 3: Final commit**

```
git add -A
git commit -m "chore: drag-and-drop kanban smoke test cleanup"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `src/context/DragContext.tsx` | Context for column bounds + dragged ticket id |
| 2 | `src/components/KanbanBoard.tsx` | Wrap in DragProvider, measure Doing column on layout |
| 3 | `src/components/KanbanColumn.tsx` | isDropTarget highlight, onLayout prop |
| 4 | `src/components/TicketCard.tsx` | Pan gesture, floating animation, drop detection, remove Start Work button |
| 5 | `src/components/KanbanColumn.tsx` | Update empty state hint |
| 6 | — | Final smoke test |
