// src/utils/levelUtils.ts
import type { UserRole } from '@/types/index';

/**
 * Calculates user level based on total XP and subscription role.
 * - Base level: +1 Level for every 50 XP (Level 1 to 100).
 * - PRO members get +10 bonus level buffer.
 * - SUPER hosts have all 100 levels unlocked.
 */
export function getUserLevel(xp: number = 0, role?: UserRole | string): number {
  if (role === 'SUPER') return 100;
  const baseLevel = Math.floor(xp / 50) + 1;
  const roleBonus = role === 'PRO' ? 10 : 0;
  return Math.min(100, Math.max(1, baseLevel + roleBonus));
}

/**
 * Calculates the maximum room level the user is permitted to enter.
 * Allows a +3 challenge buffer for ambitious learners.
 */
export function getMaxAllowedLevel(xp: number = 0, role?: UserRole | string): number {
  if (role === 'SUPER') return 100;
  const userLvl = getUserLevel(xp, role);
  return Math.min(100, userLvl + 3);
}

/**
 * Determines whether a room's level requirement exceeds the user's current level.
 */
export function isRoomLevelLocked(roomLevelId: number, xp: number = 0, role?: UserRole | string): boolean {
  if (role === 'SUPER') return false;
  const maxAllowed = getMaxAllowedLevel(xp, role);
  return roomLevelId > maxAllowed;
}
