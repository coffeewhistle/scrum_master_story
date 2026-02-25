/**
 * KanbanBoard — The three-column Kanban board (Todo → Doing → Done).
 *
 * Reads tickets from useBoardStore, filters them by status, and renders
 * three KanbanColumn components in a horizontal row.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useBoardStore } from '../stores/boardStore';
import type { TicketStatus } from '../types';
import KanbanColumn from './KanbanColumn';

/** Column configuration: display title and matching TicketStatus */
const COLUMNS: { title: string; status: TicketStatus }[] = [
  { title: 'To Do', status: 'todo' },
  { title: 'Doing', status: 'doing' },
  { title: 'Done', status: 'done' },
];

const KanbanBoard: React.FC = () => {
  const tickets = useBoardStore((s) => s.tickets);

  return (
    <View style={styles.board}>
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.status}
          title={col.title}
          status={col.status}
          tickets={tickets.filter((t) => t.status === col.status)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  board: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 2,
  },
});

export default KanbanBoard;
