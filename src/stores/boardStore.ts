import { create } from 'zustand';
import { Ticket, TicketStatus } from '../types/ticket.types';

interface BoardState {
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
