import { create } from 'zustand';
import { Ticket, TicketStatus } from '../types/ticket.types';

export interface BoardState {
  // State
  /** Stories + blockers on the active sprint board */
  tickets: Ticket[];
  /** Stories available in the planning backlog (status = 'backlog') */
  backlog: Ticket[];
  draggedTicketId: string | null;

  // Actions
  /** Set the sprint board tickets (call at sprint start with committed stories) */
  setTickets: (tickets: Ticket[]) => void;
  /** Set the backlog (call when contract is accepted or sprint ends) */
  setBacklog: (tickets: Ticket[]) => void;
  /** Move a ticket to a different column on the sprint board */
  moveTicket: (ticketId: string, toColumn: TicketStatus) => void;
  /** Progress a ticket's pointsCompleted by pointsDone */
  progressTicket: (ticketId: string, pointsDone: number) => void;
  /** Mark a blocker as done (smashed) */
  smashBlocker: (ticketId: string) => void;
  /** Add a blocker to the sprint board */
  spawnBlocker: (ticket: Ticket) => void;
  /** Move a story from backlog → sprint board (planning phase) */
  commitStory: (ticketId: string) => void;
  /** Move a story from sprint board → backlog (planning phase, undo) */
  uncommitStory: (ticketId: string) => void;
  setDraggedTicket: (id: string | null) => void;
  /** Clear sprint board tickets only (keep backlog for next sprint) */
  clearBoard: () => void;
  /** Clear everything — sprint board + backlog (end of contract) */
  clearAll: () => void;
}

/** Selector: are there any active blockers halting work? */
export function selectIsBlocked(state: BoardState): boolean {
  return state.tickets.some(
    (t) => t.type === 'blocker' && t.status === 'doing',
  );
}

export const useBoardStore = create<BoardState>()((set) => ({
  tickets: [],
  backlog: [],
  draggedTicketId: null,

  setTickets: (tickets: Ticket[]) =>
    set({ tickets }),

  setBacklog: (tickets: Ticket[]) =>
    set({ backlog: tickets }),

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

  commitStory: (ticketId: string) =>
    set((state) => {
      const story = state.backlog.find((t) => t.id === ticketId);
      if (!story) return state;
      return {
        backlog: state.backlog.filter((t) => t.id !== ticketId),
        tickets: [...state.tickets, { ...story, status: 'todo' as TicketStatus }],
      };
    }),

  uncommitStory: (ticketId: string) =>
    set((state) => {
      const story = state.tickets.find((t) => t.id === ticketId && t.type === 'story');
      if (!story) return state;
      return {
        tickets: state.tickets.filter((t) => t.id !== ticketId),
        backlog: [...state.backlog, { ...story, status: 'backlog' as TicketStatus }],
      };
    }),

  setDraggedTicket: (id: string | null) =>
    set({ draggedTicketId: id }),

  clearBoard: () =>
    set({ tickets: [], draggedTicketId: null }),

  clearAll: () =>
    set({ tickets: [], backlog: [], draggedTicketId: null }),
}));
