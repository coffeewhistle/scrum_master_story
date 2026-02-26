/**
 * TicketCard — Renders a single story ticket on the Kanban board.
 *
 * Visual states:
 *   todo:  Draggable — press and hold ~150ms, then drag right into Doing column.
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
        withSpring(1.02, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 150 }),
      );
    }
  }, [isDone]);

  // Drag animation values (todo only)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const isDraggingShared = useSharedValue(false);

  const doMoveTicket = (id: string) => {
    moveTicket(id, 'doing');
  };

  const resetDrag = () => {
    'worklet';
    translateX.value = withSpring(0, { damping: 18, stiffness: 250 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 250 });
    dragScale.value = withSpring(1, { damping: 15, stiffness: 200 });
    isDraggingShared.value = false;
    runOnJS(setDraggedTicketId)(null);
  };

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart(() => {
      'worklet';
      isDraggingShared.value = true;
      dragScale.value = withSpring(1.05, { damping: 10, stiffness: 180 });
      runOnJS(setDraggedTicketId)(ticket.id);
    })
    .onUpdate((e) => {
      'worklet';
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      // Use translationX to determine drop target.
      // Doing column is to the right of Todo — a rightward drag of >40% of
      // the column width means "drop into Doing".
      const colWidth = doingColumnBounds?.width ?? 120;
      const threshold = colWidth * 0.4;

      if (e.translationX > threshold) {
        runOnJS(doMoveTicket)(ticket.id);
      }

      resetDrag();
    })
    .onFinalize(() => {
      'worklet';
      if (isDraggingShared.value) {
        resetDrag();
      }
    });

  const draggableAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: isDraggingShared.value ? dragScale.value : cardScale.value },
    ],
    zIndex: isDraggingShared.value ? 999 : 1,
    shadowOpacity: isDraggingShared.value ? 0.6 : 0.3,
  }));

  const staticAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const cardContent = (
    <View style={[styles.card, isDone && styles.cardDone]}>
      {/* Header: title + points badge */}
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

      {/* Progress bar — doing & done */}
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

      {/* Drag hint — todo only */}
      {isTodo && (
        <Text style={styles.dragHint}>≡ hold & drag right to start</Text>
      )}
    </View>
  );

  // Non-draggable states (doing, done)
  if (!isTodo) {
    return (
      <Animated.View style={[styles.wrapper, staticAnimStyle]}>
        {cardContent}
      </Animated.View>
    );
  }

  // Draggable todo ticket
  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.wrapper, draggableAnimStyle]}>
        {cardContent}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  wrapper: {
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
