import { create } from 'zustand';
import { Ticket, TicketStatus } from '../types/ticket.types';

export interface BoardState {
  // State
  tickets: Ticket[];
  draggedTicketId: string | null;

  // Actions
  addTickets: (tickets: Ticket[]) => void;
  moveTicket: (ticketId: string, toColumn: TicketStatus) => void;
  progressTicket: (ticketId: string, pointsDone: number) => void;
  smashBlocker: (ticketId: string) => void;
  spawnBlocker: (ticket: Ticket) => void;
  setDraggedTicket: (id: string | null) => void;
  clearBoard: () => void;
}

/** Selector: are there any active blockers halting work? */
export function selectIsBlocked(state: BoardState): boolean {
  return state.tickets.some(
    (t) => t.type === 'blocker' && t.status === 'doing',
  );
}

export const useBoardStore = create<BoardState>()((set) => ({
  tickets: [],
  draggedTicketId: null,

  addTickets: (tickets: Ticket[]) =>
    set({ tickets }),

  moveTicket: (ticketId: string, toColumn: TicketStatus) =>
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: toColumn } : ticket,
      ),
    })),

  progressTicket: (ticketId: string, pointsDone: number) =>
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              pointsCompleted: Math.min(
                ticket.pointsCompleted + pointsDone,
                ticket.storyPoints,
              ),
            }
          : ticket,
      ),
    })),

  smashBlocker: (ticketId: string) =>
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: 'done' as TicketStatus } : ticket,
      ),
    })),

  spawnBlocker: (ticket: Ticket) =>
    set((state) => ({
      tickets: [...state.tickets, ticket],
    })),

  setDraggedTicket: (id: string | null) =>
    set({ draggedTicketId: id }),

  clearBoard: () =>
    set({ tickets: [], draggedTicketId: null }),
}));
