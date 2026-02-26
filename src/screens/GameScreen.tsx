/**
 * GameScreen — Primary game screen that orchestrates all UI components.
 *
 * Layout (top to bottom):
 *   1. <HUD />            — fixed header with day counter, client, cash
 *   2. <PlanningBoard />  — shown during planning phase
 *      <KanbanBoard />    — shown during active/review phases
 *   3. Bottom bar         — phase-specific controls
 *
 * Sprint lifecycle:
 *   idle     → Shows "Accept Contract" button. Tapping generates a contract,
 *              sets the backlog, and starts the planning phase.
 *   planning → Shows <PlanningBoard /> + <SprintTimer />.
 *   active   → Shows <KanbanBoard /> + <SprintTimer /> + optional Ship Early.
 *   review   → Shows <SprintResultScreen /> as a modal overlay.
 */

import React, { useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

// Components
import HUD from '../components/HUD';
import KanbanBoard from '../components/KanbanBoard';
import PlanningBoard from '../components/PlanningBoard';
import SprintTimer from '../components/SprintTimer';
import SprintResultScreen from './SprintResultScreen';
import Toast from '../components/Toast';
import TeamDrawer from '../components/TeamDrawer';

// Stores
import { useSprintStore } from '../stores/sprintStore';
import { useBoardStore } from '../stores/boardStore';
import { useUIStore } from '../stores/uiStore';

// Engine
import { generateContract, resetSimState, shipEarly, generateCandidates, startSprint } from '../engine/SprintSimulator';
import { GameLoop } from '../engine/GameLoop';

import { colors } from '../constants/theme';
import { formatCash } from '../utils/format.utils';

const GameScreen: React.FC = () => {
  const phase = useSprintStore((s) => s.phase);
  const sprintNumber = useSprintStore((s) => s.sprintNumber);
  const cashOnHand = useSprintStore((s) => s.cashOnHand);
  const showSprintResult = useUIStore((s) => s.showSprintResult);
  const canShipEarly = useUIStore((s) => s.canShipEarly);

  const [teamDrawerOpen, setTeamDrawerOpen] = React.useState(false);

  // Stop game loop on unmount
  useEffect(() => {
    generateCandidates(); // Populate job board on first load
    return () => {
      GameLoop.stop();
    };
  }, []);

  const handleAcceptContract = useCallback(() => {
    if (useSprintStore.getState().phase !== 'idle') return;

    const contract = generateContract();

    // Set full backlog in boardStore; sprint board starts empty
    useBoardStore.getState().setBacklog(contract.allStories);
    useBoardStore.getState().setTickets([]);

    // Accept contract — transitions to 'planning' phase
    useSprintStore.getState().acceptContract(contract);

    // Reset simulation counters and start GameLoop (planning day ticks)
    resetSimState();
    GameLoop.start();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container}>
        {/* Fixed header */}
        <HUD onTeamPress={() => setTeamDrawerOpen(true)} />

        {/* Main board area */}
        <View style={styles.boardArea}>
          {phase === 'planning' ? <PlanningBoard /> : <KanbanBoard />}
        </View>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          {phase === 'idle' && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={styles.startContainer}
            >
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleAcceptContract}
                activeOpacity={0.8}
              >
                <Text style={styles.startButtonEmoji}>📝</Text>
                <Text style={styles.startButtonText}>Accept Contract</Text>
              </TouchableOpacity>
              <Text style={styles.idleHint}>
                {sprintNumber === 0
                  ? 'Accept your first contract to begin!'
                  : `Contract complete! Cash: ${formatCash(cashOnHand)}`}
              </Text>
            </Animated.View>
          )}

          {phase === 'planning' && (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={styles.planningContainer}
            >
              <TouchableOpacity
                style={styles.startSprintButton}
                onPress={startSprint}
                activeOpacity={0.8}
              >
                <Text style={styles.startButtonEmoji}>🚀</Text>
                <Text style={styles.startButtonText}>Start Sprint</Text>
              </TouchableOpacity>
              <Text style={styles.idleHint}>
                Commit stories above, then start the sprint
              </Text>
            </Animated.View>
          )}

          {phase === 'active' && (
            <>
              <SprintTimer />
              {canShipEarly && (
                <Animated.View
                  entering={FadeIn.duration(300)}
                  style={styles.shipEarlyContainer}
                >
                  <TouchableOpacity
                    style={styles.shipEarlyButton}
                    onPress={shipEarly}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.shipEarlyEmoji}>📦</Text>
                    <Text style={styles.shipEarlyText}>Ship Early</Text>
                  </TouchableOpacity>
                  <Text style={styles.shipEarlyHint}>
                    Deliver ahead of schedule for a bonus!
                  </Text>
                </Animated.View>
              )}
            </>
          )}
        </View>

        {/* Sprint result modal overlay */}
        {showSprintResult && <SprintResultScreen />}

        {/* Toast notification */}
        <Toast />

        {/* Team drawer */}
        <TeamDrawer
          visible={teamDrawerOpen}
          onClose={() => setTeamDrawerOpen(false)}
        />
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  boardArea: {
    flex: 1,
  },
  bottomBar: {
    minHeight: 60,
  },
  startContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    // Shadow
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  startButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  idleHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  planningContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.accent,
  },
  startSprintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: colors.info,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  shipEarlyContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.success,
  },
  shipEarlyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  shipEarlyEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  shipEarlyText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  shipEarlyHint: {
    color: colors.success,
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
});

export default GameScreen;
