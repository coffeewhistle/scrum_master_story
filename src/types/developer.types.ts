/**
 * Developer types for the team management system.
 */

/** The five developer archetypes available for hire */
export type DeveloperArchetype = 'junior' | 'mid' | 'senior' | 'qa' | 'scrumMaster';

/**
 * Passive team-wide effect a developer provides.
 * Applied continuously while the developer is on the roster.
 */
export interface DeveloperTrait {
  /** Human-readable label shown in the Job Board card */
  label: string;
  /** Short description shown under the label */
  description: string;
  /**
   * Fractional reduction applied to BLOCKER_SPAWN_CHANCE_PER_TICK.
   * e.g. 0.25 means blockers spawn 25% less often.
   */
  blockerRateReduction?: number;
  /**
   * Multiplier applied to totalVelocity after summing all developer velocities.
   * e.g. 0.10 means +10% team velocity aura. Stacks additively per Scrum Master.
   */
  velocityAura?: number;
}

export interface Developer {
  /** Unique identifier (UUID) */
  id: string;
  /** Display name (e.g., "Alex the Intern") */
  name: string;
  /** Archetype determining base stats and available traits */
  archetype: DeveloperArchetype;
  /** Story points this developer completes per engine tick */
  velocity: number;
  /** Visual identifier — emoji */
  avatar: string;
  /** Optional passive aura effect applied while on the team */
  trait?: DeveloperTrait;
  /** Cost in cash to hire this developer (only set on candidates, not roster members) */
  hireCost?: number;
}
