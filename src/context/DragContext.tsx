/**
 * DragContext — Shared state for the drag-and-drop Kanban board.
 *
 * Provides:
 *   - doingColumnBounds: measured screen x + width of the Doing column
 *   - draggedTicketId: id of ticket currently being dragged (null if none)
 *   - setDoingColumnBounds: called by KanbanBoard after layout
 *   - setDraggedTicketId: called by TicketCard during drag lifecycle
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ColumnBounds {
  x: number;
  width: number;
}

interface DragContextValue {
  doingColumnBounds: ColumnBounds | null;
  draggedTicketId: string | null;
  setDoingColumnBounds: (bounds: ColumnBounds) => void;
  setDraggedTicketId: (id: string | null) => void;
}

const DragContext = createContext<DragContextValue>({
  doingColumnBounds: null,
  draggedTicketId: null,
  setDoingColumnBounds: () => {},
  setDraggedTicketId: () => {},
});

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [doingColumnBounds, setDoingColumnBounds] = useState<ColumnBounds | null>(null);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);

  const handleSetBounds = useCallback((bounds: ColumnBounds) => {
    setDoingColumnBounds(bounds);
  }, []);

  const handleSetDraggedId = useCallback((id: string | null) => {
    setDraggedTicketId(id);
  }, []);

  return (
    <DragContext.Provider
      value={{
        doingColumnBounds,
        draggedTicketId,
        setDoingColumnBounds: handleSetBounds,
        setDraggedTicketId: handleSetDraggedId,
      }}
    >
      {children}
    </DragContext.Provider>
  );
};

export function useDragContext(): DragContextValue {
  return useContext(DragContext);
}
