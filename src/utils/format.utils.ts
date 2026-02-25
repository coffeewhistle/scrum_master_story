/**
 * Formatting utilities for display values.
 */

/**
 * Format a cash amount with $ prefix and comma separators.
 * e.g., 1500 -> "$1,500"
 */
export function formatCash(amount: number): string {
  return '$' + Math.floor(amount).toLocaleString('en-US');
}

/**
 * Format a day counter.
 * e.g., (3, 10) -> "Day 3/10"
 */
export function formatDay(current: number, total: number): string {
  return `Day ${current}/${total}`;
}

/**
 * Format a percentage.
 * e.g., 0.85 -> "85%"
 */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/**
 * Format velocity as points per tick display.
 * e.g., 1.5 -> "1.5 pts/tick"
 */
export function formatVelocity(velocity: number): string {
  return `${velocity.toFixed(1)} pts/tick`;
}
