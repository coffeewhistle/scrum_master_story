/**
 * KanbanColumn — A single column on the Kanban board (todo / doing / done).
 *
 * Renders a colored header strip, ticket count, and a scrollable list of
 * TicketCard or BlockerCard components depending on ticket type.
 *
 * For MVP, instead of full drag-and-drop, todo tickets have a "Start Work"
 * button, and the engine auto-moves completed tickets to done.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { Ticket, TicketStatus } from '../types';
import TicketCard from './TicketCard';
import BlockerCard from './BlockerCard';
import { colors } from '../constants/theme';

interface KanbanColumnProps {
  title: string;
  status: TicketStatus;
  tickets: Ticket[];
}

/** Header accent color per column status */
const COLUMN_COLORS: Record<TicketStatus, string> = {
  todo: colors.info,
  doing: colors.warning,
  done: colors.success,
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  tickets,
}) => {
  const accentColor = COLUMN_COLORS[status];

  // Separate active blockers (shown at top) from story tickets
  const activeBlockers = tickets.filter(
    (t) => t.type === 'blocker' && t.status !== 'done',
  );
  const storyTickets = tickets.filter((t) => t.type === 'story');
  const doneBlockers = tickets.filter(
    (t) => t.type === 'blocker' && t.status === 'done',
  );

  const visibleCount =
    storyTickets.length + activeBlockers.length;

  return (
    <View style={styles.column}>
      {/* Header strip */}
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{visibleCount}</Text>
        </View>
      </View>

      {/* Scrollable ticket list */}
      <ScrollView
        style={styles.ticketList}
        contentContainerStyle={styles.ticketListContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Blockers rendered first with priority */}
        {activeBlockers.map((ticket) => (
          <BlockerCard key={ticket.id} ticket={ticket} />
        ))}

        {/* Story tickets */}
        {storyTickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}

        {/* Empty state */}
        {visibleCount === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {status === 'todo'
                ? 'No tickets yet'
                : status === 'doing'
                ? 'Move tickets here'
                : 'Complete work!'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    flex: 1,
    marginHorizontal: 2,
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
  ticketList: {
    flex: 1,
  },
  ticketListContent: {
    padding: 4,
    paddingBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
  },
});

export default KanbanColumn;
