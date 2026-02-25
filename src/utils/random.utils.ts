/**
 * Random number utilities for the simulation engine.
 * 
 * Uses a simple seeded PRNG (mulberry32) for deterministic simulation
 * when needed, plus convenience wrappers around Math.random for general use.
 */

/**
 * Mulberry32 — a simple 32-bit seeded PRNG.
 * Returns a function that produces a new random number [0, 1) on each call.
 */
export function createSeededRng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a random element from an array.
 */
export function randomPick<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Returns true with the given probability (0 to 1).
 */
export function rollChance(probability: number): boolean {
  return Math.random() < probability;
}
