/**
 * SprintResultScreen — Modal overlay shown at the end of each sprint.
 *
 * Interim mode (result.kind === 'interim'):
 *   - Shows sprint stats + contract-wide progress bar
 *   - "Next Sprint →" button advances to planning phase
 *
 * Final mode (result.kind === 'final'):
 *   - Shows grade, full stats, and cash breakdown
 *   - "Collect & Continue" banks earnings and returns to idle
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
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { useUIStore } from '../stores/uiStore';
import { useSprintStore } from '../stores/sprintStore';
import { useBoardStore } from '../stores/boardStore';
import { formatCash } from '../utils/format.utils';
import type { SprintGrade } from '../types';
import { colors } from '../constants/theme';
import { resetSimState } from '../engine/SprintSimulator';
import { GameLoop } from '../engine/GameLoop';

/** Grade → color mapping */
const GRADE_COLORS: Record<SprintGrade, string> = {
  S: colors.gold,
  A: colors.success,
  B: colors.info,
  C: colors.warning,
  D: '#c0392b',
  F: colors.danger,
};

/** Grade → flavor text */
const GRADE_LABELS: Record<SprintGrade, string> = {
  S: 'PERFECT SPRINT!',
  A: 'Great Work!',
  B: 'Solid Effort',
  C: 'Needs Improvement',
  D: 'Rough Sprint',
  F: 'Sprint Failed',
};

const SprintResultScreen: React.FC = () => {
  const { showSprintResult, lastSprintResult, dismissResult } = useUIStore();
  const collectPayout = useSprintStore((s) => s.collectPayout);
  const advanceContractSprint = useSprintStore((s) => s.advanceContractSprint);
  const clearAll = useBoardStore((s) => s.clearAll);
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
  const totalEarned = result.cashEarned + result.bonusEarned + result.earlyDeliveryBonus;

  const handleNextSprint = () => {
    clearBoard();
    dismissResult();
    advanceContractSprint();
    resetSimState();
    GameLoop.start();
  };

  const handleCollect = () => {
    collectPayout(totalEarned);
    clearAll();
    dismissResult();
  };

  // ── INTERIM MODE ─────────────────────────────────────────────────────────
  if (result.kind === 'interim') {
    const contractProgress =
      result.contractPointsTotal > 0
        ? result.contractPointsCompleted / result.contractPointsTotal
        : 0;

    return (
      <Modal
        visible
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleNextSprint}
      >
        <View style={styles.overlay}>
          <Animated.View
            entering={SlideInDown.springify().damping(14)}
            style={styles.card}
          >
            <Text style={styles.interimTitle}>
              Sprint {result.sprintNumber} of {result.totalSprints} Complete
            </Text>
            <Text style={styles.interimSubtitle}>
              {result.totalSprints - result.sprintNumber} sprint
              {result.totalSprints - result.sprintNumber !== 1 ? 's' : ''} remaining on this contract
            </Text>

            <View style={styles.divider} />

            <Animated.View
              entering={FadeIn.delay(200).duration(400)}
              style={styles.statsContainer}
            >
              <StatRow
                label="Stories This Sprint"
                value={`${result.ticketsCompleted} / ${result.ticketsTotal}`}
              />
              <StatRow
                label="Points This Sprint"
                value={`${result.pointsCompleted} / ${result.pointsTotal} pts`}
              />
              <StatRow
                label="Blockers Smashed"
                value={`${result.blockersSmashed}`}
                icon="💥"
              />
            </Animated.View>

            <View style={styles.divider} />

            <Animated.View
              entering={FadeIn.delay(400).duration(400)}
              style={{ width: '100%' }}
            >
              <Text style={styles.contractProgressLabel}>
                Contract Progress: {result.contractPointsCompleted} / {result.contractPointsTotal} pts
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(contractProgress * 100)}%` as any },
                  ]}
                />
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeIn.delay(600).duration(400)}
              style={{ width: '100%', marginTop: 20 }}
            >
              <TouchableOpacity
                style={styles.nextSprintButton}
                onPress={handleNextSprint}
                activeOpacity={0.8}
              >
                <Text style={styles.nextSprintButtonText}>Next Sprint →</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // ── FINAL MODE ───────────────────────────────────────────────────────────
  const gradeColor = GRADE_COLORS[result.grade];
  const gradeLabel = GRADE_LABELS[result.grade];

  return (
    <Modal
      visible={showSprintResult}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCollect}
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
          {(result.grade === 'C' || result.grade === 'D' || result.grade === 'F') && (
            <Text style={styles.gradeHint}>
              Tip: Commit fewer stories and focus on completing them!
            </Text>
          )}

          <View style={styles.divider} />

          <Animated.View
            entering={FadeIn.delay(300).duration(400)}
            style={styles.statsContainer}
          >
            <StatRow
              label="Stories Completed"
              value={`${result.ticketsCompleted} / ${result.ticketsTotal}`}
            />
            <StatRow
              label="Story Points"
              value={`${result.contractPointsCompleted} / ${result.contractPointsTotal} pts`}
            />
            <StatRow
              label="Blockers Smashed"
              value={`${result.blockersSmashed}`}
              icon="💥"
            />
          </Animated.View>

          <View style={styles.divider} />

          {/* Cash breakdown */}
          <Animated.View
            entering={FadeIn.delay(600).duration(400)}
            style={styles.cashContainer}
          >
            <StatRow
              label="Cash Earned"
              value={formatCash(result.cashEarned)}
              valueColor={colors.success}
            />
            {result.bonusEarned > 0 && (
              <StatRow
                label="Perfect Bonus"
                value={`+ ${formatCash(result.bonusEarned)}`}
                valueColor={colors.gold}
                icon="⭐"
              />
            )}
            {result.earlyDeliveryBonus > 0 && (
              <StatRow
                label={`Early Delivery (${result.daysRemaining}d early)`}
                value={`+ ${formatCash(result.earlyDeliveryBonus)}`}
                valueColor={colors.success}
                icon="📦"
              />
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{formatCash(totalEarned)}</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(900).duration(400)}>
            <TouchableOpacity
              style={[styles.collectButton, { backgroundColor: gradeColor }]}
              onPress={handleCollect}
              activeOpacity={0.8}
            >
              <Text style={styles.collectButtonText}>
                {totalEarned > 0 ? '💰 Collect & Continue' : 'Try Again'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
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
  valueColor = colors.textPrimary,
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
    backgroundColor: colors.overlayBg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.bgCard,
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
    borderColor: colors.accent,
  },
  gradeContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
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
    backgroundColor: colors.accent,
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
    color: colors.textSecondary,
    fontSize: 14,
  },
  statValue: {
    color: colors.textPrimary,
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
    borderTopColor: colors.accent,
  },
  totalLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  totalValue: {
    color: colors.success,
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
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '900',
  },
  gradeHint: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
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
});

export default SprintResultScreen;
