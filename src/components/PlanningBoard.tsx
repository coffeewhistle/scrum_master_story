/**
 * PlanningBoard — Two-column planning layout shown during the planning phase.
 *
 * Left column: stories in the backlog (tap to commit to sprint)
 * Right column: stories committed to this sprint (tap to return to backlog)
 * Bottom: capacity bar showing committed points vs team capacity
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useBoardStore } from '../stores/boardStore';
import { useTeamStore } from '../stores/teamStore';
import { useSprintStore } from '../stores/sprintStore';
import { colors } from '../constants/theme';
import { TICKS_PER_DAY } from '../constants/game.constants';
import type { Ticket } from '../types';

const PlanningBoard: React.FC = () => {
  const backlog = useBoardStore((s) => s.backlog);
  const tickets = useBoardStore((s) => s.tickets);
  const commitStory = useBoardStore((s) => s.commitStory);
  const uncommitStory = useBoardStore((s) => s.uncommitStory);
  const { totalVelocity } = useTeamStore();
  const { totalDays } = useSprintStore();

  // Capacity = velocity × ticks per active day × active days (subtract 1 planning day)
  const activeDays = Math.max(1, totalDays - 1);
  const capacity = Math.round(totalVelocity * TICKS_PER_DAY * activeDays);

  const committedStories = tickets.filter((t) => t.type === 'story');
  const committedPoints = committedStories.reduce((sum, t) => sum + t.storyPoints, 0);
  const isOverCapacity = committedPoints > capacity;
  const capacityRatio = capacity > 0 ? committedPoints / capacity : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Sprint Planning</Text>
        <Text style={styles.headerSub}>Tap stories to commit them to this sprint</Text>
      </View>

      {/* Columns */}
      <View style={styles.columns}>
        {/* Backlog column */}
        <View style={styles.column}>
          <View style={[styles.columnHeader, { backgroundColor: colors.accent }]}>
            <Text style={styles.columnTitle}>BACKLOG</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{backlog.length}</Text>
            </View>
          </View>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {backlog.length === 0 ? (
              <Text style={styles.emptyText}>All stories committed!</Text>
            ) : (
              backlog.map((ticket) => (
                <BacklogCard
                  key={ticket.id}
                  ticket={ticket}
                  onCommit={() => commitStory(ticket.id)}
                />
              ))
            )}
          </ScrollView>
        </View>

        {/* This Sprint column */}
        <View style={styles.column}>
          <View style={[styles.columnHeader, { backgroundColor: colors.info }]}>
            <Text style={styles.columnTitle}>THIS SPRINT</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{committedStories.length}</Text>
            </View>
          </View>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {committedStories.length === 0 ? (
              <Text style={styles.emptyText}>Tap backlog stories to add them</Text>
            ) : (
              committedStories.map((ticket) => (
                <CommittedCard
                  key={ticket.id}
                  ticket={ticket}
                  onUncommit={() => uncommitStory(ticket.id)}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>

      {/* Capacity bar */}
      <View style={styles.capacityBar}>
        <View style={styles.capacityLabelRow}>
          <Text style={styles.capacityLabel}>
            Capacity: {committedPoints} / {capacity} pts
          </Text>
          {isOverCapacity && (
            <Animated.Text
              entering={FadeIn.duration(200)}
              style={styles.overCapacityWarning}
            >
              ⚠️ Overcommitted!
            </Animated.Text>
          )}
        </View>
        <View style={styles.capacityTrack}>
          <View
            style={[
              styles.capacityFill,
              {
                width: `${Math.min(capacityRatio * 100, 100)}%` as any,
                backgroundColor: isOverCapacity ? colors.danger : colors.success,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const BacklogCard: React.FC<{ ticket: Ticket; onCommit: () => void }> = ({
  ticket,
  onCommit,
}) => (
  <TouchableOpacity style={styles.card} onPress={onCommit} activeOpacity={0.7}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {ticket.title}
      </Text>
      <View style={styles.pointsBadge}>
        <Text style={styles.pointsText}>{ticket.storyPoints}</Text>
      </View>
    </View>
    <Text style={styles.cardAction}>+ Add to sprint</Text>
  </TouchableOpacity>
);

const CommittedCard: React.FC<{ ticket: Ticket; onUncommit: () => void }> = ({
  ticket,
  onUncommit,
}) => (
  <TouchableOpacity
    style={[styles.card, styles.committedCard]}
    onPress={onUncommit}
    activeOpacity={0.7}
  >
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {ticket.title}
      </Text>
      <View style={[styles.pointsBadge, styles.committedPointsBadge]}>
        <Text style={styles.pointsText}>{ticket.storyPoints}</Text>
      </View>
    </View>
    <Text style={styles.cardActionRemove}>✕ Remove</Text>
  </TouchableOpacity>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  headerSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingTop: 4,
    gap: 4,
  },
  column: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    overflow: 'hidden',
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  columnTitle: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: 'center',
  },
  countText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 6,
    gap: 6,
    paddingBottom: 16,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  committedCard: {
    borderLeftColor: colors.info,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  pointsBadge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  committedPointsBadge: {
    backgroundColor: colors.info,
  },
  pointsText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  cardAction: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  cardActionRemove: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  capacityBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.accent,
  },
  capacityLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  capacityLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  overCapacityWarning: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  capacityTrack: {
    height: 10,
    backgroundColor: colors.bgTrack,
    borderRadius: 5,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 5,
  },
});

export default PlanningBoard;
