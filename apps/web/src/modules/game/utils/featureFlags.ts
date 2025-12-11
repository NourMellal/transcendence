/**
 * Feature Flags for Game Modes
 * 
 * Controls whether the game runs in local (offline arcade) mode
 * or online (backend-connected) mode.
 */

export type GameMode = 'local' | 'online';

/**
 * Get the current game mode from environment variables
 * 
 * @returns 'local' for offline arcade mode, 'online' for backend-connected mode
 */
export function getGameMode(): GameMode {
  const mode = import.meta.env.VITE_GAME_MODE?.toLowerCase();
  
  if (mode === 'local' || mode === 'offline') {
    return 'local';
  }
  
  // Default to online mode for production
  return 'online';
}

/**
 * Check if the game is running in local (offline) mode
 */
export function isLocalMode(): boolean {
  return getGameMode() === 'local';
}

/**
 * Check if the game is running in online (backend-connected) mode
 */
export function isOnlineMode(): boolean {
  return getGameMode() === 'online';
}

/**
 * Get feature flag configuration
 */
export const featureFlags = {
  gameMode: getGameMode(),
  isLocal: isLocalMode(),
  isOnline: isOnlineMode(),
} as const;

// Log the current mode on initialization
console.log(`[FeatureFlags] Game mode: ${featureFlags.gameMode}`);
