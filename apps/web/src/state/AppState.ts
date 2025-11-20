import { Signal } from '../core/Signal';
import type { GameStats, User } from '../models';

export interface AppState {
  user: Signal<User | null>;
  gameStats: Signal<GameStats>;
  isLoading: Signal<boolean>;
}

const defaultStats: GameStats = {
  activePlayers: 0,
  gamesPlayed: 0,
  tournaments: 0,
  matchmakingTime: 0,
  winRate: 0,
};

export const createAppState = (): AppState => ({
  user: new Signal<User | null>(null),
  gameStats: new Signal<GameStats>(defaultStats),
  isLoading: new Signal<boolean>(false),
});



