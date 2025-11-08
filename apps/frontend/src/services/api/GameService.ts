import { HttpClient } from './HttpClient.js';
import {
	Game,
	GameStatus,
	CreateGameRequest,
	CreateGameResponse,
	ScoreUpdateRequest,
} from '../../../models/Game';

export interface GameListParams {
	status?: GameStatus;
	page?: number;
	limit?: number;
}

export interface GameListResult {
	games: Game[];
	total: number;
	page: number;
	limit: number;
	hasMore: boolean;
}

export class GameService {
	private http: HttpClient;

	constructor(baseURL: string = '/api') {
		this.http = new HttpClient(baseURL);
	}

	//games
	async listGames(params: GameListParams = {}): Promise<GameListResult> {
		try {
			const qs = new URLSearchParams();
			if (params.status) qs.append('status', params.status);
			if (params.page != null) qs.append('page', String(params.page));
			if (params.limit != null) qs.append('limit', String(params.limit));

			const query = qs.toString();
			return await this.http.get<GameListResult>(`/game${query ? `?${query}` : ''}`);
		} catch (e) {
			throw this.handleError(e);
		}
	}

	async createGame(payload: CreateGameRequest): Promise<CreateGameResponse> {
		try {
			return await this.http.post<CreateGameResponse>('/game', payload);
		} catch (e) {
			throw this.handleError(e);
		}
	}

	async getGame(gameId: string): Promise<Game> {
		try {
			return await this.http.get<Game>(`/game/${gameId}`);
		} catch (e) {
			throw this.handleError(e);
		}
	}

	async joinGame(gameId: string): Promise<{ game: Game; message?: string }> {
		try {
			return await this.http.post<{ game: Game; message?: string }>(`/game/${gameId}/join`, {});
		} catch (e) {
			throw this.handleError(e);
		}
	}

	async leaveGame(gameId: string): Promise<{ message: string }> {
		try {
			return await this.http.post<{ message: string }>(`/game/${gameId}/leave`, {});
		} catch (e) {
			throw this.handleError(e);
		}
	}

	async updateScore(gameId: string, update: ScoreUpdateRequest): Promise<{ game: Game }> {
		try {
			return await this.http.post<{ game: Game }>(`/game/${gameId}/score`, update);
		} catch (e) {
			throw this.handleError(e);
		}
	}

	async getState(gameId: string): Promise<Game> {
		try {
			return await this.http.get<Game>(`/game/${gameId}/state`);
		} catch (e) {
			throw this.handleError(e);
		}
	}

	//polling helper
	pollState(
		gameId: string,
		onUpdate: (state: Game) => void,
		intervalMs = 1500
	): () => void {
		let stopped = false;
		const tick = async () => {
			if (stopped) return;
			try {
				const state = await this.getState(gameId);
				onUpdate(state);
			} catch (e) {
				console.debug('pollState error:', e);
			} finally {
				if (!stopped) setTimeout(tick, intervalMs);
			}
		};
		setTimeout(tick, intervalMs);
		return () => {
			stopped = true;
		};
	}

	private handleError(error: unknown): Error {
		if (error instanceof Error) {
			const anyErr = error as any;
			const message = anyErr?.body?.message || anyErr.message || 'Request failed';
			const e = new Error(message);
			(e as any).status = anyErr.status;
			(e as any).body = anyErr.body;
			return e;
		}
		return new Error('An unexpected error occurred');
	}
}
