import { create } from 'zustand';
import { Developer } from '../types/developer.types';
import { BASE_DEVELOPER_VELOCITY, MAX_TEAM_SIZE } from '../constants/game.constants';

interface TeamState {
  // State
  developers: Developer[];
  totalVelocity: number;
  candidates: Developer[];
  maxTeamSize: number;

  // Actions
  /** Add a developer to the roster and recalculate velocity */
  addDeveloper: (dev: Developer) => void;
  /** Replace the current job board candidates */
  refreshCandidates: (candidates: Developer[]) => void;
  /** Hire a candidate: move from candidates → roster, recalculate velocity */
  hireDeveloper: (candidateId: string) => void;
  /** Recalculate totalVelocity from roster (call after trait changes) */
  updateVelocity: () => void;
}

/**
 * Compute effective total velocity:
 * sum of all dev velocities × (1 + sum of all velocityAura values)
 */
function computeTotalVelocity(developers: Developer[]): number {
  const baseVelocity = developers.reduce((sum, d) => sum + d.velocity, 0);
  const auraBoost = developers.reduce(
    (sum, d) => sum + (d.trait?.velocityAura ?? 0),
    0,
  );
  return baseVelocity * (1 + auraBoost);
}

const defaultDeveloper: Developer = {
  id: 'dev-001',
  name: 'Alex the Intern',
  archetype: 'junior',
  velocity: BASE_DEVELOPER_VELOCITY,
  avatar: '👨‍💻',
};

export const useTeamStore = create<TeamState>()((set) => ({
  developers: [defaultDeveloper],
  totalVelocity: computeTotalVelocity([defaultDeveloper]),
  candidates: [],
  maxTeamSize: MAX_TEAM_SIZE,

  addDeveloper: (dev: Developer) =>
    set((state) => {
      if (state.developers.length >= state.maxTeamSize) return state;
      const updatedDevs = [...state.developers, dev];
      return {
        developers: updatedDevs,
        totalVelocity: computeTotalVelocity(updatedDevs),
      };
    }),

  refreshCandidates: (candidates: Developer[]) =>
    set({ candidates }),

  hireDeveloper: (candidateId: string) =>
    set((state) => {
      if (state.developers.length >= state.maxTeamSize) return state;
      const candidate = state.candidates.find((c) => c.id === candidateId);
      if (!candidate) return state;
      const updatedDevs = [...state.developers, candidate];
      return {
        developers: updatedDevs,
        totalVelocity: computeTotalVelocity(updatedDevs),
        candidates: state.candidates.filter((c) => c.id !== candidateId),
      };
    }),

  updateVelocity: () =>
    set((state) => ({
      totalVelocity: computeTotalVelocity(state.developers),
    })),
}));
