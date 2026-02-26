/**
 * KanbanBoard — The three-column Kanban board (Todo → Doing → Done).
 *
 * Wraps in DragProvider so TicketCards can access column bounds.
 * Measures the Doing column position after layout for drop-zone detection.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useBoardStore, selectIsBlocked } from '../stores/boardStore';
import type { TicketStatus } from '../types';
import KanbanColumn from './KanbanColumn';
import { DragProvider, useDragContext } from '../context/DragContext';

const COLUMNS: { title: string; status: TicketStatus }[] = [
  { title: 'To Do', status: 'todo' },
  { title: 'Doing', status: 'doing' },
  { title: 'Done', status: 'done' },
];

/** Inner board — must be inside DragProvider to access context */
const KanbanBoardInner: React.FC = () => {
  const tickets = useBoardStore((s) => s.tickets);
  const isBlocked = useBoardStore(selectIsBlocked);
  const { draggedTicketId, setDoingColumnBounds } = useDragContext();

  const handleColumnLayout = useCallback(
    (status: TicketStatus, event: LayoutChangeEvent) => {
      if (status === 'doing') {
        const { x, width } = event.nativeEvent.layout;
        setDoingColumnBounds({ x, width });
      }
    },
    [setDoingColumnBounds],
  );

  return (
    <View style={styles.board}>
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.status}
          title={col.title}
          status={col.status}
          tickets={tickets.filter((t) => t.status === col.status)}
          isBlocked={col.status === 'doing' && isBlocked}
          isDropTarget={col.status === 'doing' && draggedTicketId !== null}
          onLayout={(e) => handleColumnLayout(col.status, e)}
        />
      ))}
    </View>
  );
};

const KanbanBoard: React.FC = () => (
  <DragProvider>
    <KanbanBoardInner />
  </DragProvider>
);

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
