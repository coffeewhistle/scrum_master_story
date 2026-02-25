/**
 * Ticket generation templates and balance values.
 * 
 * Used by the contract generator to create varied sprint boards.
 */

/** Story title templates — randomly selected when generating contracts */
export const STORY_TITLES = [
  'Implement Login API',
  'Build Dashboard UI',
  'Add Payment Gateway',
  'Fix Database Schema',
  'Create User Profile Page',
  'Set Up CI/CD Pipeline',
  'Write Unit Tests',
  'Optimize Image Loading',
  'Add Push Notifications',
  'Refactor Auth Module',
  'Build Search Feature',
  'Add Dark Mode Toggle',
  'Implement Caching Layer',
  'Create Admin Panel',
  'Set Up Analytics',
  'Build Onboarding Flow',
  'Add Export to CSV',
  'Implement WebSocket Chat',
  'Build Settings Page',
  'Add Multi-language Support',
] as const;

/** Blocker title templates — appear as crisis events mid-sprint */
export const BLOCKER_TITLES = [
  'Merge Conflict!',
  'Server Down!',
  'Dependency Vulnerability',
  'API Rate Limit Hit',
  'Database Migration Failed',
  'Build Pipeline Broken',
  'Memory Leak Detected',
  'SSL Certificate Expired',
] as const;

/** Client name templates for contract generation */
export const CLIENT_NAMES = [
  'Acme Corp',
  'TechStart Inc',
  'MegaBank Financial',
  'CloudNine Solutions',
  'RetailMax',
  'HealthFirst App',
  'EduLearn Platform',
  'GreenEnergy Co',
  'FoodDash Delivery',
  'TravelWise',
] as const;

/** Story point range for generated story tickets */
export const STORY_POINT_RANGE = {
  min: 1,
  max: 5,
} as const;

/** Fixed story points for blocker tickets (cost to smash) */
export const BLOCKER_STORY_POINTS = 0;

/** Number of tickets per contract */
export const TICKETS_PER_CONTRACT = {
  min: 12,
  max: 18,
} as const;

export const SPRINTS_PER_CONTRACT_RANGE = { min: 2, max: 4 } as const;

/** Base payout range per contract (cash) */
export const CONTRACT_PAYOUT_RANGE = {
  min: 2000,
  max: 6000,
} as const;
