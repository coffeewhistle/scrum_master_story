/**
 * SprintResultScreen — Modal overlay shown at the end of each sprint.
 *
 * Displays the sprint grade, completion stats, and cash breakdown.
 * Player taps "Collect & Continue" to bank earnings and return to idle.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { useUIStore } from '../stores/uiStore';
import { useSprintStore } from '../stores/sprintStore';
import { useBoardStore } from '../stores/boardStore';
import { formatCash } from '../utils/format.utils';
import type { SprintGrade } from '../types';

/** Grade → color mapping */
const GRADE_COLORS: Record<SprintGrade, string> = {
  S: '#ffd700', // gold
  A: '#4ecca3', // green
  B: '#3498db', // blue
  C: '#e67e22', // orange
  F: '#e94560', // red
};

/** Grade → flavor text */
const GRADE_LABELS: Record<SprintGrade, string> = {
  S: 'PERFECT SPRINT!',
  A: 'Great Work!',
  B: 'Solid Effort',
  C: 'Needs Improvement',
  F: 'Sprint Failed',
};

const SprintResultScreen: React.FC = () => {
  const { showSprintResult, lastSprintResult, dismissResult } = useUIStore();
  const collectPayout = useSprintStore((s) => s.collectPayout);
  const clearBoard = useBoardStore((s) => s.clearBoard);

  // Scale-in animation for the grade letter
  const gradeScale = useSharedValue(0);

  React.useEffect(() => {
    if (showSprintResult) {
      gradeScale.value = withDelay(
        200,
        withSpring(1, { damping: 8, stiffness: 150 }),
      );
    } else {
      gradeScale.value = 0;
    }
  }, [showSprintResult]);

  const gradeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: gradeScale.value }],
  }));

  if (!showSprintResult || !lastSprintResult) {
    return null;
  }

  const result = lastSprintResult;
  const gradeColor = GRADE_COLORS[result.grade];
  const gradeLabel = GRADE_LABELS[result.grade];
  const totalEarned = result.cashEarned + result.bonusEarned;

  const handleCollect = () => {
    collectPayout(totalEarned);
    clearBoard();
    dismissResult();
  };

  return (
    <Modal
      visible={showSprintResult}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={SlideInDown.springify().damping(14)}
          style={styles.card}
        >
          {/* Grade display */}
          <Animated.View style={[styles.gradeContainer, gradeAnimStyle]}>
            <Text style={[styles.gradeLetter, { color: gradeColor }]}>
              {result.grade}
            </Text>
          </Animated.View>
          <Text style={[styles.gradeLabel, { color: gradeColor }]}>
            {gradeLabel}
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Stats */}
          <View style={styles.statsContainer}>
            <StatRow
              label="Tickets Completed"
              value={`${result.ticketsCompleted} / ${result.ticketsTotal}`}
            />
            <StatRow
              label="Blockers Smashed"
              value={`${result.blockersSmashed}`}
              icon="💥"
            />
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Cash breakdown */}
          <View style={styles.cashContainer}>
            <StatRow
              label="Cash Earned"
              value={formatCash(result.cashEarned)}
              valueColor="#4ecca3"
            />
            {result.bonusEarned > 0 && (
              <StatRow
                label="Perfect Bonus"
                value={`+ ${formatCash(result.bonusEarned)}`}
                valueColor="#ffd700"
                icon="⭐"
              />
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{formatCash(totalEarned)}</Text>
            </View>
          </View>

          {/* Collect button */}
          <TouchableOpacity
            style={[styles.collectButton, { backgroundColor: gradeColor }]}
            onPress={handleCollect}
            activeOpacity={0.8}
          >
            <Text style={styles.collectButtonText}>
              💰 Collect & Continue
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

/** Reusable stat row */
interface StatRowProps {
  label: string;
  value: string;
  icon?: string;
  valueColor?: string;
}

const StatRow: React.FC<StatRowProps> = ({
  label,
  value,
  icon,
  valueColor = '#ffffff',
}) => (
  <View style={styles.statRow}>
    <Text style={styles.statLabel}>
      {icon ? `${icon} ` : ''}
      {label}
    </Text>
    <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  gradeContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0f3460',
    marginBottom: 8,
  },
  gradeLetter: {
    fontSize: 56,
    fontWeight: '900',
  },
  gradeLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#0f3460',
    marginVertical: 16,
  },
  statsContainer: {
    width: '100%',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    color: '#a0a0a0',
    fontSize: 14,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cashContainer: {
    width: '100%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
  },
  totalLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  totalValue: {
    color: '#4ecca3',
    fontSize: 20,
    fontWeight: '900',
  },
  collectButton: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  collectButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '900',
  },
});

export default SprintResultScreen;
