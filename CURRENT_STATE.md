# Scrum Master Story - Current State

## Project Overview
A React Native/Expo mobile game where you play as a Scrum Master leading a software development team. Features drag-and-drop Kanban board, sprint simulation, team morale system, and event-driven gameplay.

## Tech Stack
- React Native 0.81.5 with Expo 54
- React Native Reanimated 4.x for animations
- React Native Gesture Handler 2.x for drag-and-drop
- Zustand 5.x for state management

## Recent Work
- Implemented drag-and-drop Kanban board (Pan gesture on todo tickets)
- Fixed UX issues: repositioned toast to bottom, simplified animations, removed excessive popups
- Created DragContext for managing drag state across components
- Added README with setup instructions

## Current Branch
`master` - pushed to https://github.com/coffeewhistle/scrum_master_story

## Key Files
- `src/screens/GameScreen.tsx` - Main game screen
- `src/components/KanbanBoard.tsx` - Kanban board with columns
- `src/components/TicketCard.tsx` - Draggable story cards
- `src/context/DragContext.tsx` - Drag state management
- `src/engine/SprintSimulator.ts` - Sprint logic and events
- `src/stores/boardStore.ts` - Zustand store for tickets

## Running the App
```bash
npm start        # Start Metro bundler
npm run android  # Run on Android
npm run ios      # Run on iOS
npm run web      # Run on web
```

## Next Steps (if any)
- None pending - recent UX fixes committed and pushed
