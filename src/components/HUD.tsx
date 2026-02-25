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
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import { useSprintStore } from '../stores/sprintStore';
import { useTeamStore } from '../stores/teamStore';
import { formatCash, formatDay, formatVelocity } from '../utils/format.utils';
import { colors } from '../constants/theme';

interface HUDProps {
  onTeamPress: () => void;
}

const HUD: React.FC<HUDProps> = ({ onTeamPress }) => {
  const { currentDay, totalDays, cashOnHand, currentContract, phase, sprintNumber } =
    useSprintStore();
  const { developers, totalVelocity } = useTeamStore();

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

      {/* Bottom row: team button + velocity */}
      <View style={styles.velocityRow}>
        <TouchableOpacity onPress={onTeamPress} style={styles.teamBtn} activeOpacity={0.7}>
          <View style={styles.teamAvatars}>
            {developers.map((dev) => (
              <Text key={dev.id} style={styles.avatarEmoji}>{dev.avatar}</Text>
            ))}
          </View>
          <Text style={styles.teamBtnLabel}>👥 Team</Text>
        </TouchableOpacity>
        <View style={styles.velocityDisplay}>
          <Text style={styles.velocityLabel}>Team Speed</Text>
          <Text style={styles.velocityText}>{formatVelocity(totalVelocity)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgPrimary,
    paddingTop: (Constants.statusBarHeight ?? 48) + 8,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  teamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  teamBtnLabel: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  velocityDisplay: {
    alignItems: 'flex-end',
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
  teamAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  avatarEmoji: {
    fontSize: 16,
    marginRight: 2,
  },
});

export default HUD;
