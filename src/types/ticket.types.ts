/**
 * Ticket types for the Kanban board system.
 * 
 * Stories: Standard work items that developers complete for velocity.
 * Blockers: Crisis tickets that halt progress until the player smashes them.
 */

export type TicketType = 'story' | 'blocker';

export type TicketStatus = 'todo' | 'doing' | 'done';

export interface Ticket {
  /** Unique identifier (UUID) */
  id: string;
  /** Whether this is a normal story or a blocker */
  type: TicketType;
  /** Display name shown on the card (e.g., "Implement Login API") */
  title: string;
  /** Total story points required to complete this ticket */
  storyPoints: number;
  /** Points of work completed so far (0 to storyPoints) */
  pointsCompleted: number;
  /** Current column on the Kanban board */
  status: TicketStatus;
}
