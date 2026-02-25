/**
 * TicketCard — Renders a single story ticket on the Kanban board.
 *
 * Visual states:
 *   todo:  White card with a "Start Work" button to move to doing.
 *   doing: White card with an animated progress bar.
 *   done:  Faded card with a green checkmark.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useDerivedValue,
} from 'react-native-reanimated';
import type { Ticket } from '../types';
import { useBoardStore } from '../stores/boardStore';
import { colors } from '../constants/theme';

interface TicketCardProps {
  ticket: Ticket;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  const moveTicket = useBoardStore((s) => s.moveTicket);

  const isDone = ticket.status === 'done';
  const isTodo = ticket.status === 'todo';
  const isDoing = ticket.status === 'doing';

  // Progress ratio for the bar
  const progressRatio =
    ticket.storyPoints > 0
      ? Math.min(ticket.pointsCompleted / ticket.storyPoints, 1)
      : 0;

  // Animated progress bar width using reanimated
  const animatedProgress = useSharedValue(progressRatio);

  // Update animated value when ticket progress changes
  React.useEffect(() => {
    animatedProgress.value = withSpring(progressRatio, {
      damping: 15,
      stiffness: 120,
    });
  }, [progressRatio]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%` as any,
  }));

  // Celebration bounce when ticket completes
  const cardScale = useSharedValue(1);

  React.useEffect(() => {
    if (isDone) {
      // Celebration bounce: scale up then settle
      cardScale.value = withSequence(
        withSpring(1.05, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 150 }),
      );
    }
  }, [isDone]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handleStartWork = () => {
    moveTicket(ticket.id, 'doing');
  };

  return (
    <Animated.View style={cardAnimStyle}>
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

      {/* Story point display for todo */}
      {isTodo && (
        <Text style={styles.todoPoints}>
          {ticket.storyPoints} story points
        </Text>
      )}

      {/* Start Work button for todo tickets */}
      {isTodo && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartWork}
          activeOpacity={0.7}
        >
          <Text style={styles.startButtonText}>▶ Start Work</Text>
        </TouchableOpacity>
      )}
    </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 4,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
  todoPoints: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 6,
  },
  startButton: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  startButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default TicketCard;
