/**
 * SprintTimer — Visual sprint progress indicator.
 *
 * Shows a progress bar that fills as the sprint advances through its days.
 * Color shifts from green (early) → yellow (mid) → red (late) to convey
 * urgency as the deadline approaches.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useSprintStore } from '../stores/sprintStore';
import { formatDay } from '../utils/format.utils';
import { colors } from '../constants/theme';

const SprintTimer: React.FC = () => {
  const { currentDay, totalDays } = useSprintStore();

  const progress = totalDays > 0 ? Math.min(currentDay / totalDays, 1) : 0;

  // Animate the progress bar width
  const animatedProgress = useSharedValue(progress);

  React.useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 400 });
  }, [progress]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%` as any,
  }));

  // Color based on progress ratio: green → yellow → red
  const getBarColor = (): string => {
    if (progress <= 0.4) return colors.success; // green - early
    if (progress <= 0.7) return colors.yellow;  // yellow - mid
    return colors.danger;                        // red - late
  };

  const barColor = getBarColor();

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.dayText}>{formatDay(currentDay, totalDays)}</Text>
        <Text style={styles.percentText}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: barColor },
            progressBarStyle,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.accent,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  percentText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  track: {
    height: 8,
    backgroundColor: colors.bgTrack,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default SprintTimer;
