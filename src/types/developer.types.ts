/**
 * Developer types for the team management system.
 * 
 * MVP: Single generic developer archetype.
 * Future: RPG class tree (Junior Coder, SDET, Full Stack Sorcerer, etc.)
 */

export interface Developer {
  /** Unique identifier (UUID) */
  id: string;
  /** Display name (e.g., "Alex the Intern") */
  name: string;
  /** Story points this developer completes per engine tick */
  velocity: number;
  /** Visual identifier — emoji for MVP, sprite key for full game */
  avatar: string;
}
