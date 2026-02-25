/**
 * GameLoop — Fixed-timestep simulation driver.
 *
 * Uses requestAnimationFrame with an accumulator pattern so the simulation
 * advances at a deterministic rate (TICK_INTERVAL_MS) regardless of display
 * refresh rate.
 *
 * The loop only invokes SprintSimulator.tick() while the sprint phase is
 * 'active'. It can be started and stopped cleanly with no leaked frames.
 *
 * Usage:
 *   import { GameLoop } from './GameLoop';
 *   GameLoop.start();   // begin the loop
 *   GameLoop.stop();    // pause / tear down
 */

import { TICK_INTERVAL_MS } from '../constants/game.constants';
import { tick as simulatorTick } from './SprintSimulator';
import { useSprintStore } from '../stores/sprintStore';

// ─── Internal state ──────────────────────────────────────────────────────────

/** Handle returned by requestAnimationFrame — used for cancellation. */
let rafHandle: number | null = null;

/** Timestamp (ms) of the previous animation frame. */
let lastFrameTime: number | null = null;

/** Accumulated real time that hasn't been consumed by ticks yet. */
let accumulator = 0;

/** True when the loop is actively running. */
let running = false;

// ─── Frame callback ──────────────────────────────────────────────────────────

/**
 * Core frame function scheduled via requestAnimationFrame.
 *
 * 1. Compute deltaTime since last frame.
 * 2. Add deltaTime to the accumulator.
 * 3. While the accumulator holds at least one TICK_INTERVAL_MS, drain a tick.
 * 4. Schedule the next frame.
 *
 * A safety cap prevents a "spiral of death" when the tab is backgrounded:
 * if the accumulated time is larger than 10 × TICK_INTERVAL_MS we clamp it
 * so we never try to process dozens of ticks in a single frame.
 */
function frame(timestamp: number): void {
  if (!running) return;

  if (lastFrameTime === null) {
    // First frame after (re)start — no delta yet, just seed the timestamp.
    lastFrameTime = timestamp;
    rafHandle = requestAnimationFrame(frame);
    return;
  }

  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  // Safety cap: limit catch-up to 10 ticks per frame.
  const maxAccumulator = TICK_INTERVAL_MS * 10;
  accumulator = Math.min(accumulator + deltaTime, maxAccumulator);

  // Only tick while the sprint is in the 'active' phase.
  const phase = useSprintStore.getState().phase;

  if (phase === 'active') {
    while (accumulator >= TICK_INTERVAL_MS) {
      accumulator -= TICK_INTERVAL_MS;
      simulatorTick();

      // After a tick the phase may have changed (sprint ended). Break out
      // early so we don't keep ticking a finished sprint.
      if (useSprintStore.getState().phase !== 'active') {
        accumulator = 0;
        break;
      }
    }
  } else {
    // Not in an active sprint — don't accumulate time.
    // Reset so we don't get a burst of ticks when the next sprint starts.
    accumulator = 0;
  }

  // Schedule next frame.
  rafHandle = requestAnimationFrame(frame);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Singleton GameLoop controller.
 *
 * Call `start()` when the game screen mounts and `stop()` when it unmounts
 * or the app goes to background.
 */
export const GameLoop = {
  /**
   * Start the animation-frame loop.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  start(): void {
    if (running) return;
    running = true;
    lastFrameTime = null;
    accumulator = 0;
    rafHandle = requestAnimationFrame(frame);
  },

  /**
   * Stop the loop and cancel any pending animation frame.
   * The loop can be restarted later via `start()`.
   */
  stop(): void {
    running = false;
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    lastFrameTime = null;
    accumulator = 0;
  },

  /** Whether the loop is currently running. */
  isRunning(): boolean {
    return running;
  },
} as const;
