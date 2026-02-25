/**
 * Ticket types for the Kanban board system.
 */

export type TicketType = 'story' | 'blocker';

/** backlog = in contract but not yet pulled into a sprint board */
export type TicketStatus = 'backlog' | 'todo' | 'doing' | 'done';

export interface Ticket {
  /** Unique identifier (UUID) */
  id: string;
  /** Whether this is a normal story or a blocker */
  type: TicketType;
  /** Display name shown on the card */
  title: string;
  /** Total story points required to complete this ticket */
  storyPoints: number;
  /** Points of work completed so far (0 to storyPoints) */
  pointsCompleted: number;
  /** Current column on the Kanban board */
  status: TicketStatus;
}
