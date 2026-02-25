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
  withRepeat,
  withSequence,
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

  const barColorStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%` as any,
    backgroundColor: interpolateColor(
      animatedProgress.value,
      [0, 0.5, 1],
      [colors.success, colors.yellow, colors.danger],
    ),
  }));

  // Pulse the container when sprint is in the final 30%
  const pulseOpacity = useSharedValue(1);

  React.useEffect(() => {
    if (progress > 0.7) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 400 }),
          withTiming(1, { duration: 400 }),
        ),
        -1,
        true,
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [progress]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimStyle]}>
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
            barColorStyle,
          ]}
        />
      </View>
    </Animated.View>
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
