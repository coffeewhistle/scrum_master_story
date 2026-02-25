/**
 * BlockerCard — Renders a blocker ticket with a pulsing danger animation.
 *
 * Blockers halt all story progress while active. The player must tap the
 * "SMASH!" button to dismiss them. Smashing triggers a shrink animation
 * before the card disappears.
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import type { Ticket } from '../types';
import { useBoardStore } from '../stores/boardStore';
import { recordBlockerSmash } from '../engine/SprintSimulator';

interface BlockerCardProps {
  ticket: Ticket;
}

const BlockerCard: React.FC<BlockerCardProps> = ({ ticket }) => {
  const smashBlocker = useBoardStore((s) => s.smashBlocker);

  // Pulsing glow animation
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  // Smash shrink animation
  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);

  // Start the pulsing animation on mount
  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // infinite
      true,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const smashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const doSmash = useCallback(() => {
    smashBlocker(ticket.id);
    recordBlockerSmash();
  }, [ticket.id, smashBlocker]);

  const handleSmash = () => {
    // Shrink animation, then remove
    cardScale.value = withSpring(0, { damping: 12, stiffness: 200 }, () => {
      runOnJS(doSmash)();
    });
    cardOpacity.value = withTiming(0, { duration: 250 });
  };

  // Don't render if already done (smashed)
  if (ticket.status === 'done') {
    return null;
  }

  return (
    <Animated.View style={[styles.cardOuter, smashStyle]}>
      <Animated.View style={[styles.card, pulseStyle]}>
        {/* Blocker label */}
        <View style={styles.labelRow}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <View style={styles.blockerBadge}>
            <Text style={styles.blockerBadgeText}>BLOCKER</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {ticket.title}
        </Text>

        {/* SMASH button */}
        <TouchableOpacity
          style={styles.smashButton}
          onPress={handleSmash}
          activeOpacity={0.7}
        >
          <Text style={styles.smashButtonText}>💥 SMASH!</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardOuter: {
    marginBottom: 8,
    marginHorizontal: 4,
  },
  card: {
    backgroundColor: '#8b0000',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e94560',
    // Shadow
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  blockerBadge: {
    backgroundColor: '#e94560',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  blockerBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  smashButton: {
    backgroundColor: '#e94560',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  smashButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default BlockerCard;
