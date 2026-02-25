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
    if (progress <= 0.4) return '#4ecca3'; // green - early
    if (progress <= 0.7) return '#f0c040'; // yellow - mid
    return '#e94560'; // red - late
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
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  percentText: {
    color: '#a0a0a0',
    fontSize: 12,
    fontWeight: '500',
  },
  track: {
    height: 8,
    backgroundColor: '#2a2a4a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default SprintTimer;
