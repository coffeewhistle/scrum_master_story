/**
 * HUD — Heads-Up Display fixed at the top of the game screen.
 *
 * Shows key sprint stats at a glance:
 *   Left:   Day counter (Day X/Y)
 *   Center: Current contract client name
 *   Right:  Cash on hand
 *   Below:  Team velocity indicator
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSprintStore } from '../stores/sprintStore';
import { useTeamStore } from '../stores/teamStore';
import { formatCash, formatDay, formatVelocity } from '../utils/format.utils';
import { colors } from '../constants/theme';

const HUD: React.FC = () => {
  const { currentDay, totalDays, cashOnHand, currentContract, phase, sprintNumber } =
    useSprintStore();
  const { totalVelocity } = useTeamStore();

  const clientLabel =
    currentContract?.clientName ?? (phase === 'idle' ? 'No Contract' : '—');

  return (
    <View style={styles.container}>
      <View style={styles.mainRow}>
        {/* Day counter */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {phase === 'active' || phase === 'review'
              ? `Sprint #${sprintNumber}`
              : 'Sprint'}
          </Text>
          <Text style={styles.value}>
            {phase === 'idle' ? 'Idle' : formatDay(currentDay, totalDays)}
          </Text>
        </View>

        {/* Client name */}
        <View style={[styles.section, styles.centerSection]}>
          <Text style={styles.label}>Client</Text>
          <Text style={styles.clientName} numberOfLines={1}>
            {clientLabel}
          </Text>
        </View>

        {/* Cash */}
        <View style={[styles.section, styles.rightSection]}>
          <Text style={styles.label}>Cash</Text>
          <Text style={styles.cashValue}>{formatCash(cashOnHand)}</Text>
        </View>
      </View>

      {/* Velocity bar */}
      <View style={styles.velocityRow}>
        <Text style={styles.velocityLabel}>Team Speed</Text>
        <Text style={styles.velocityText}>
          {formatVelocity(totalVelocity)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgPrimary,
    paddingTop: 48, // account for status bar
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    flex: 1,
  },
  centerSection: {
    alignItems: 'center',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  clientName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  cashValue: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '700',
  },
  velocityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  velocityLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginRight: 8,
  },
  velocityText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default HUD;
