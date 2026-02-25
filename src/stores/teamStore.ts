import { create } from 'zustand';
import { Developer } from '../types/developer.types';
import { BASE_DEVELOPER_VELOCITY } from '../constants/game.constants';

interface TeamState {
  // State
  developers: Developer[];
  totalVelocity: number;

  // Actions
  addDeveloper: (dev: Developer) => void;
  updateVelocity: () => void;
}

const defaultDeveloper: Developer = {
  id: 'dev-001',
  name: 'Alex the Intern',
  velocity: BASE_DEVELOPER_VELOCITY,
  avatar: '👨‍💻',
};

export const useTeamStore = create<TeamState>()((set) => ({
  developers: [defaultDeveloper],
  totalVelocity: defaultDeveloper.velocity,

  addDeveloper: (dev: Developer) =>
    set((state) => {
      const updatedDevs = [...state.developers, dev];
      return {
        developers: updatedDevs,
        totalVelocity: updatedDevs.reduce((sum, d) => sum + d.velocity, 0),
      };
    }),

  updateVelocity: () =>
    set((state) => ({
      totalVelocity: state.developers.reduce((sum, d) => sum + d.velocity, 0),
    })),
}));
