
import Component from '@/core/Component';
	import { appState } from '@/state';
import router from '@/core/Router';
import { gameService } from '../services/GameService';
import type { Game, Player } from '../types/game.types';

interface GameLobbyProps {
	gameId: string;
}

interface GameLobbyState {
	game: Game | null;
	isReady: boolean;
	isLoading: boolean;
	error: string | null;
	timeRemaining: number; // seconds until timeout
}

export class GameLobby extends Component<GameLobbyProps, GameLobbyState> {
	private unsubscribeGame?: () => void;
	private timeoutInterval?: number;

	getInitialState(): GameLobbyState {
		return {
			game: null,
			isReady: false,
			isLoading: true,
			error: null,
			timeRemaining: 120, // 2 minutes
		};
	}

	async onMount(): Promise<void> {
		try {
			// Fetch initial lobby state
			const game = await gameService.getGame(this.props.gameId);
			this.state.game = game;
			this.state.isLoading = false;
			this.update({});

			// Subscribe to game state updates from Signal
			this.unsubscribeGame = appState.game.subscribe((updatedGame) => {
				if (!updatedGame || updatedGame.id !== this.props.gameId) return;

				this.state.game = updatedGame;

				// Auto-navigate when game starts
				if (updatedGame.status === 'IN_PROGRESS') {
					router.navigate(`/game/play/${updatedGame.id}`);
				}

				this.update({});
			});

			// Start timeout countdown
			this.startTimeout();

			// Bind event handlers
			this.element.addEventListener('click', this.handleClick);
		} catch (error) {
			this.state.error = 'Failed to load lobby';
			this.state.isLoading = false;
			this.update({});
		}
	}

	render(): string {
		const { game, isReady, isLoading, error, timeRemaining } = this.state;

		if (isLoading) {
			return this.renderLoading();
		}

		if (error || !game) {
			return this.renderError(error || 'Lobby not found');
		}

		const currentUser = appState.auth.get().user;
		const opponent = game.players.find((p) => p.id !== currentUser?.id);
		const hasOpponent = opponent !== undefined;

		return `
			<div class="min-h-screen flex items-center justify-center p-4" style="background: var(--color-background);">
				<div class="w-full max-w-2xl">
					<!-- Header -->
					<div class="text-center mb-8">
						<h1 class="text-3xl sm:text-4xl font-bold mb-2" style="color: var(--color-text);">
							Game Lobby
						</h1>
						<p class="text-sm" style="color: var(--color-text-secondary);">
							${hasOpponent ? 'Opponent found! Get ready.' : `Waiting for opponent... ${this.formatTime(timeRemaining)}`}
						</p>
					</div>

					<!-- Players Grid -->
					<div class="glass-panel p-6 sm:p-8 mb-6" style="border: 1px solid var(--color-card-border);">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<!-- Current Player -->
							${this.renderPlayerCard(currentUser!, 'You', isReady)}

							<!-- Opponent Slot -->
							${hasOpponent 
								? this.renderPlayerCard(opponent, 'Opponent', true)
								: this.renderEmptySlot()
							}
						</div>
					</div>

					<!-- Game Settings -->
					<div class="glass-panel p-6 mb-6" style="border: 1px solid var(--color-card-border);">
						<h3 class="text-lg font-semibold mb-4" style="color: var(--color-text);">Game Settings</h3>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span style="color: var(--color-text-secondary);">Score Limit:</span>
								<span class="ml-2 font-medium" style="color: var(--color-text);">${game.settings?.scoreLimit || 11}</span>
							</div>
							<div>
								<span style="color: var(--color-text-secondary);">Ball Speed:</span>
								<span class="ml-2 font-medium" style="color: var(--color-text);">${game.settings?.ballSpeed || 'Normal'}</span>
							</div>
						</div>
					</div>

					<!-- Actions -->
					<div class="flex flex-col sm:flex-row gap-4">
						<button
							data-action="ready"
							class="btn-touch flex-1 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 touch-feedback"
							style="
								background: ${isReady ? 'var(--color-success)' : 'var(--color-primary)'};
								color: var(--color-btn-primary-text);
								opacity: ${!hasOpponent || isReady ? '0.5' : '1'};
								cursor: ${!hasOpponent || isReady ? 'not-allowed' : 'pointer'};
							"
							${!hasOpponent || isReady ? 'disabled' : ''}
						>
							${isReady ? '✓ Ready' : 'Ready Up'}
						</button>

						<button
							data-action="leave"
							class="btn-touch px-6 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-300 touch-feedback"
							style="background: var(--color-secondary); color: var(--color-text);"
						>
							Leave Lobby
						</button>
					</div>
				</div>
			</div>
		`;
	}

	private renderPlayerCard(player: Player, label: string, ready: boolean): string {
		return `
			<div class="p-4 rounded-lg" style="background: var(--color-surface); border: 1px solid var(--color-card-border-inner);">
				<div class="flex items-center gap-3">
					<img 
						src="${player.avatarUrl || '/default-avatar.png'}" 
						alt="${player.username}"
						class="w-12 h-12 rounded-full"
						style="border: 2px solid var(--color-primary);"
					>
					<div class="flex-1">
						<div class="font-medium" style="color: var(--color-text);">
							${player.username}
						</div>
						<div class="text-xs" style="color: var(--color-text-secondary);">
							${label}
						</div>
					</div>
					${ready ? `
						<div class="status status--success">
							Ready
						</div>
					` : ''}
				</div>
			</div>
		`;
	}

	private renderEmptySlot(): string {
		return `
			<div class="p-4 rounded-lg flex items-center justify-center" style="background: var(--color-surface); border: 1px dashed var(--color-border);">
				<div class="text-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style="border-color: var(--color-primary);"></div>
					<div class="text-sm" style="color: var(--color-text-secondary);">
						Waiting for opponent...
					</div>
				</div>
			</div>
		`;
	}

	private renderLoading(): string {
		return `
			<div class="min-h-screen flex items-center justify-center">
				<div class="text-center">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style="border-color: var(--color-primary);"></div>
					<div style="color: var(--color-text-secondary);">Loading lobby...</div>
				</div>
			</div>
		`;
	}

	private renderError(message: string): string {
		return `
			<div class="min-h-screen flex items-center justify-center p-4">
				<div class="glass-panel p-8 max-w-md text-center">
					<div class="text-4xl mb-4">❌</div>
					<h2 class="text-xl font-semibold mb-2" style="color: var(--color-error);">
						${message}
					</h2>
					<button
						data-action="back"
						class="btn-touch mt-4 px-6 py-2 rounded-lg"
						style="background: var(--color-primary); color: var(--color-btn-primary-text);"
					>
						Back to Dashboard
					</button>
				</div>
			</div>
		`;
	}

	private handleClick = async (e: Event): Promise<void> => {
		const target = e.target as HTMLElement;
		const action = target.dataset.action;

		if (action === 'ready') {
			await this.handleReady();
		} else if (action === 'leave') {
			await this.handleLeave();
		} else if (action === 'back') {
			router.navigate('/dashboard');
		}
	};

	private async handleReady(): Promise<void> {
		try {
			await gameService.setReady(this.props.gameId);
			this.state.isReady = true;
			this.update({});
		} catch (error) {
			console.error('Failed to set ready:', error);
		}
	}

	private async handleLeave(): Promise<void> {
		try {
			await gameService.leaveGame(this.props.gameId);
			router.navigate('/dashboard');
		} catch (error) {
			console.error('Failed to leave game:', error);
		}
	}

	private startTimeout(): void {
		this.timeoutInterval = window.setInterval(() => {
			this.state.timeRemaining--;

			if (this.state.timeRemaining <= 0) {
				this.handleTimeout();
			} else {
				this.update({});
			}
		}, 1000);
	}

	private handleTimeout(): void {
		if (this.timeoutInterval) {
			clearInterval(this.timeoutInterval);
		}
		this.state.error = 'Lobby timeout - no opponent found';
		this.update({});
	}

	private formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	onUnmount(): void {
		this.unsubscribeGame?.();
		this.element.removeEventListener('click', this.handleClick);
    
		if (this.timeoutInterval) {
			clearInterval(this.timeoutInterval);
		}
	}
}
