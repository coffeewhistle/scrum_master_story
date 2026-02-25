/**
 * DevAvatar — Compact developer avatar component.
 *
 * Displays the developer's emoji avatar inside a circular background
 * with their name below. Used in team roster displays.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Developer } from '../types';
import { colors } from '../constants/theme';

interface DevAvatarProps {
  developer: Developer;
}

const DevAvatar: React.FC<DevAvatarProps> = ({ developer }) => {
  return (
    <View style={styles.container}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarEmoji}>{developer.avatar}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {developer.name}
      </Text>
      <Text style={styles.velocity}>{developer.velocity.toFixed(1)} pts</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 64,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.danger,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  velocity: {
    color: colors.textSecondary,
    fontSize: 9,
    marginTop: 1,
  },
});

export default DevAvatar;
