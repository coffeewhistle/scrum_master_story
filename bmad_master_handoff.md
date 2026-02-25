# Handoff to BMAD Master: Software Studio Story MVP Prototype

## Context for BMAD Master
The user (Coleh) has just completed the Game Brief for **Software Studio Story**, a Kairosoft-style management simulation about Agile software development. 

The user wants to orchestrate this project using the BMAD method (Build-Measure-Automate-Deploy) utilizing extreme parallelism via Git Worktrees. However, the user does not want to act as the primary Orchestrator. They are handing the orchestration role over to **you**, the BMAD Master.

## Core Architectural Decisions
1. **Tech Stack:** React Native with Expo (optimized for AI generation, cross-platform).
2. **State Management:** Zustand, but strictly implemented using an Event-Driven Architecture.
3. **Simulation Engine:** Pure TypeScript game loop (based on timestamp deltas) decoupled from the React render cycle to prevent UI blocking.
4. **Development Method:** AI agents working in isolated Git Worktrees to compress the timeline.

## Immediate Objective: The MVP Prototype
The user's immediate goal is **not** to build the entire game or write a massive Game Design Document (GDD). The immediate goal is to validate the core gameplay loop.

**The MVP Scope:**
- A functional Kanban board (To-Do, Doing, Done).
- One generic developer generating Velocity per tick.
- Basic ticket types (Stories and Blockers) to test the tactile dragging and "smashing" mechanics.
- Simple math to calculate a final payout.
- *No advanced RPG classes, tech trees, or culture pivots in the MVP.*

## Your Mission as BMAD Master
1. Review the `game-brief.md` located in `F:/Code/Scrum Master Story/`.
2. Establish the strict API contracts and Zustand store domains required to prevent "Context Divergence" (merge conflicts) between future AI agents.
3. Architect the decoupled TypeScript simulation loop.
4. Spin up the initial Expo environment and coordinate the specialized AI agents (Dev, Architect) in Git Worktrees to build the vertical slice MVP.
