import Component from '../../../core/Component';
import { gameService } from '../services/GameService';
import { navigate } from '../../../routes';
import type { CreateGameRequest } from '../types/game.types';

interface CreateGameState {
  gameMode: 'CLASSIC' | 'TOURNAMENT';
  isPrivate: boolean;
  scoreLimit: number;
  ballSpeed: number;
  paddleSpeed: number;
  isCreating: boolean;
  error: string | null;
}

export default class CreateGamePage extends Component<{}, CreateGameState> {
  getInitialState(): CreateGameState {
    return {
      gameMode: 'CLASSIC',
      isPrivate: false,
      scoreLimit: 11,
      ballSpeed: 5,
      paddleSpeed: 8,
      isCreating: false,
      error: null,
    };
  }

  render(): string {
    const { gameMode, isPrivate, scoreLimit, ballSpeed, paddleSpeed, isCreating, error } = this.state;

    return `
      <div class="relative min-h-screen flex items-center justify-center px-4 py-12 safe-area-inset" style="background: var(--color-bg-dark);">
        <!-- Cyberpunk background effect -->
        <div class="absolute inset-0 cyberpunk-radial-bg"></div>
        <div class="absolute inset-0" style="background: radial-gradient(circle at 20% 50%, rgba(255, 0, 110, 0.05), transparent 50%), radial-gradient(circle at 80% 50%, rgba(0, 179, 217, 0.05), transparent 50%);"></div>
        
        <div class="relative w-full max-w-2xl">
          <!-- Header -->
          <div class="text-center mb-8">
            <h1 class="text-3xl sm:text-4xl font-bold mb-3" style="color: var(--color-text-primary);">
              Create Game
            </h1>
            <p class="text-sm sm:text-base" style="color: var(--color-text-secondary);">
              Configure your match settings
            </p>
          </div>

          <!-- Main Form Card -->
          <div class="glass-panel p-6 sm:p-8 mb-6" style="border: 1px solid var(--color-panel-border);">
            
            ${error ? `
              <div class="mb-6 p-4 rounded-lg" style="background: rgba(255, 7, 58, 0.1); border: 1px solid var(--color-error);">
                <div class="flex items-center gap-2">
                  <span class="text-xl">⚠️</span>
                  <span style="color: var(--color-error);">${error}</span>
                </div>
              </div>
            ` : ''}

            <!-- Game Mode Selection -->
            <div class="mb-6">
              <label class="block text-sm font-semibold mb-3" style="color: var(--color-text-primary);">
                🎯 Game Mode
              </label>
              <div class="grid grid-cols-2 gap-3">
                <button 
                  data-action="select-mode" 
                  data-mode="CLASSIC"
                  class="mode-btn ${gameMode === 'CLASSIC' ? 'active' : ''} p-4 rounded-lg transition-all duration-200 touch-feedback"
                  style="border: 2px solid ${gameMode === 'CLASSIC' ? 'var(--color-brand-primary)' : 'var(--color-panel-border)'}; background: ${gameMode === 'CLASSIC' ? 'rgba(0, 179, 217, 0.1)' : 'rgba(47, 54, 61, 0.5)'};"
                >
                  <div class="text-2xl mb-2">⚡</div>
                  <div class="font-semibold" style="color: ${gameMode === 'CLASSIC' ? 'var(--color-brand-primary)' : 'var(--color-text-primary)'};">Classic</div>
                  <div class="text-xs mt-1" style="color: var(--color-text-muted);">Quick 1v1 match</div>
                </button>
                
                <button 
                  data-action="select-mode" 
                  data-mode="TOURNAMENT"
                  class="mode-btn ${gameMode === 'TOURNAMENT' ? 'active' : ''} p-4 rounded-lg transition-all duration-200 touch-feedback"
                  style="border: 2px solid ${gameMode === 'TOURNAMENT' ? 'var(--color-brand-secondary)' : 'var(--color-panel-border)'}; background: ${gameMode === 'TOURNAMENT' ? 'rgba(255, 0, 110, 0.1)' : 'rgba(47, 54, 61, 0.5)'};"
                >
                  <div class="text-2xl mb-2">🏆</div>
                  <div class="font-semibold" style="color: ${gameMode === 'TOURNAMENT' ? 'var(--color-brand-secondary)' : 'var(--color-text-primary)'};">Tournament</div>
                  <div class="text-xs mt-1" style="color: var(--color-text-muted);">Competitive mode</div>
                </button>
              </div>
            </div>

            <!-- Privacy Toggle -->
            <div class="mb-6 p-4 rounded-lg" style="background: rgba(47, 54, 61, 0.3); border: 1px solid rgba(255, 255, 255, 0.1);">
              <label class="flex items-center justify-between cursor-pointer">
                <div class="flex items-center gap-3">
                  <span class="text-lg">${isPrivate ? '🔒' : '🔓'}</span>
                  <div>
                    <div class="font-medium text-sm" style="color: var(--color-text-primary);">Private Game</div>
                    <div class="text-xs" style="color: var(--color-text-muted);">Hide from public lobbies</div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  data-action="toggle-private"
                  ${isPrivate ? 'checked' : ''}
                  class="toggle-switch"
                >
              </label>
            </div>

            <!-- Game Settings -->
            <div class="space-y-5">
              <!-- Score Limit -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-semibold" style="color: var(--color-text-primary);">
                    🎯 Score Limit
                  </label>
                  <span class="text-lg font-bold" style="color: var(--color-brand-primary);" data-value-display="score-limit">${scoreLimit}</span>
                </div>
                <input 
                  type="range" 
                  min="3" 
                  max="21" 
                  step="1"
                  value="${scoreLimit}"
                  data-action="change-score-limit"
                  class="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
                  style="background: linear-gradient(to right, var(--color-brand-primary) 0%, var(--color-brand-primary) ${((scoreLimit - 3) / 18) * 100}%, var(--color-panel-border) ${((scoreLimit - 3) / 18) * 100}%, var(--color-panel-border) 100%);"
                >
                <div class="flex justify-between text-xs mt-1" style="color: var(--color-text-muted);">
                  <span>3</span>
                  <span>21</span>
                </div>
              </div>

              <!-- Ball Speed -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-semibold" style="color: var(--color-text-primary);">
                    ⚡ Ball Speed
                  </label>
                  <span class="text-lg font-bold" style="color: var(--color-brand-secondary);" data-value-display="ball-speed">${ballSpeed}</span>
                </div>
                <input 
                  type="range" 
                  min="3" 
                  max="10" 
                  step="1"
                  value="${ballSpeed}"
                  data-action="change-ball-speed"
                  class="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
                  style="background: linear-gradient(to right, var(--color-brand-secondary) 0%, var(--color-brand-secondary) ${((ballSpeed - 3) / 7) * 100}%, var(--color-panel-border) ${((ballSpeed - 3) / 7) * 100}%, var(--color-panel-border) 100%);"
                >
                <div class="flex justify-between text-xs mt-1" style="color: var(--color-text-muted);">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </div>

              <!-- Paddle Speed -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-semibold" style="color: var(--color-text-primary);">
                    ⚙️ Paddle Speed
                  </label>
                  <span class="text-lg font-bold" style="color: var(--color-brand-accent);" data-value-display="paddle-speed">${paddleSpeed}</span>
                </div>
                <input 
                  type="range" 
                  min="4" 
                  max="12" 
                  step="1"
                  value="${paddleSpeed}"
                  data-action="change-paddle-speed"
                  class="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
                  style="background: linear-gradient(to right, var(--color-brand-accent) 0%, var(--color-brand-accent) ${((paddleSpeed - 4) / 8) * 100}%, var(--color-panel-border) ${((paddleSpeed - 4) / 8) * 100}%, var(--color-panel-border) 100%);"
                >
                <div class="flex justify-between text-xs mt-1" style="color: var(--color-text-muted);">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-3">
            <button 
              data-action="cancel"
              class="btn-touch flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-300"
              style="background: rgba(47, 54, 61, 0.8); border: 2px solid var(--color-panel-border); color: var(--color-text-primary);"
              ${isCreating ? 'disabled' : ''}
            >
              ← Back
            </button>
            
            <button 
              data-action="create"
              class="btn-touch flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-300"
              style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-accent)); color: white;"
              ${isCreating ? 'disabled' : ''}
            >
              ${isCreating ? '⏳ Creating...' : '🚀 Create Game'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    this.element?.addEventListener('click', this.handleClick);
    this.element?.addEventListener('input', this.handleInput);
    
    // Update slider gradients on mount
    this.updateSliderGradients();
  }

  private updateSliderGradients(): void {
    const scoreLimitSlider = this.element?.querySelector('[data-action="change-score-limit"]') as HTMLInputElement;
    const ballSpeedSlider = this.element?.querySelector('[data-action="change-ball-speed"]') as HTMLInputElement;
    const paddleSpeedSlider = this.element?.querySelector('[data-action="change-paddle-speed"]') as HTMLInputElement;

    if (scoreLimitSlider) {
      const percent = ((this.state.scoreLimit - 3) / 18) * 100;
      scoreLimitSlider.style.background = `linear-gradient(to right, var(--color-brand-primary) 0%, var(--color-brand-primary) ${percent}%, var(--color-panel-border) ${percent}%, var(--color-panel-border) 100%)`;
    }

    if (ballSpeedSlider) {
      const percent = ((this.state.ballSpeed - 3) / 7) * 100;
      ballSpeedSlider.style.background = `linear-gradient(to right, var(--color-brand-secondary) 0%, var(--color-brand-secondary) ${percent}%, var(--color-panel-border) ${percent}%, var(--color-panel-border) 100%)`;
    }

    if (paddleSpeedSlider) {
      const percent = ((this.state.paddleSpeed - 4) / 8) * 100;
      paddleSpeedSlider.style.background = `linear-gradient(to right, var(--color-brand-accent) 0%, var(--color-brand-accent) ${percent}%, var(--color-panel-border) ${percent}%, var(--color-panel-border) 100%)`;
    }
  }

  private handleClick = async (e: Event): Promise<void> => {
    const target = e.target as HTMLElement;
    const action = target.dataset.action || target.closest('[data-action]')?.getAttribute('data-action');

    if (!action) return;

    switch (action) {
      case 'select-mode':
        const mode = target.dataset.mode || target.closest('[data-mode]')?.getAttribute('data-mode');
        if (mode === 'CLASSIC' || mode === 'TOURNAMENT') {
          this.setState({ gameMode: mode });
        }
        break;

      case 'toggle-private':
        this.setState({ isPrivate: !this.state.isPrivate });
        break;

      case 'create':
        await this.handleCreateGame();
        break;

      case 'cancel':
        navigate('/');
        break;
    }
  };

  private handleInput = (e: Event): void => {
    const target = e.target as HTMLInputElement;
    const action = target.dataset.action;

    if (!action) return;

    switch (action) {
      case 'change-score-limit':
        const scoreLimit = parseInt(target.value, 10);
        // Update state directly without triggering re-render
        this.state.scoreLimit = scoreLimit;
        // Update the display value
        const scoreLimitDisplay = this.element?.querySelector('[data-value-display="score-limit"]');
        if (scoreLimitDisplay) scoreLimitDisplay.textContent = String(scoreLimit);
        // Update gradient
        const scorePercent = ((scoreLimit - 3) / 18) * 100;
        target.style.background = `linear-gradient(to right, var(--color-brand-primary) 0%, var(--color-brand-primary) ${scorePercent}%, var(--color-panel-border) ${scorePercent}%, var(--color-panel-border) 100%)`;
        break;

      case 'change-ball-speed':
        const ballSpeed = parseInt(target.value, 10);
        // Update state directly without triggering re-render
        this.state.ballSpeed = ballSpeed;
        // Update the display value
        const ballSpeedDisplay = this.element?.querySelector('[data-value-display="ball-speed"]');
        if (ballSpeedDisplay) ballSpeedDisplay.textContent = String(ballSpeed);
        // Update gradient
        const ballPercent = ((ballSpeed - 3) / 7) * 100;
        target.style.background = `linear-gradient(to right, var(--color-brand-secondary) 0%, var(--color-brand-secondary) ${ballPercent}%, var(--color-panel-border) ${ballPercent}%, var(--color-panel-border) 100%)`;
        break;

      case 'change-paddle-speed':
        const paddleSpeed = parseInt(target.value, 10);
        // Update state directly without triggering re-render
        this.state.paddleSpeed = paddleSpeed;
        // Update the display value
        const paddleSpeedDisplay = this.element?.querySelector('[data-value-display="paddle-speed"]');
        if (paddleSpeedDisplay) paddleSpeedDisplay.textContent = String(paddleSpeed);
        // Update gradient
        const paddlePercent = ((paddleSpeed - 4) / 8) * 100;
        target.style.background = `linear-gradient(to right, var(--color-brand-accent) 0%, var(--color-brand-accent) ${paddlePercent}%, var(--color-panel-border) ${paddlePercent}%, var(--color-panel-border) 100%)`;
        break;
    }
  };

  private async handleCreateGame(): Promise<void> {
    if (this.state.isCreating) return;

    this.setState({ isCreating: true, error: null });

    try {
      const request: CreateGameRequest = {
        gameMode: this.state.gameMode,
        isPrivate: this.state.isPrivate,
        settings: {
          scoreLimit: this.state.scoreLimit,
          ballSpeed: this.state.ballSpeed,
          paddleSpeed: this.state.paddleSpeed,
        },
      };

      console.log('[CreateGame] Creating game with settings:', request);
      const response = await gameService.createGame(request);

      console.log('[CreateGame] ✅ Game created:', response);
      
      // Navigate to lobby
      navigate(`/game/lobby/${response.id}`);
      
    } catch (error: any) {
      console.error('[CreateGame] ❌ Failed to create game:', error);
      this.setState({ 
        error: error.message || 'Failed to create game. Please try again.',
        isCreating: false,
      });
    }
  }

  onUnmount(): void {
    this.element?.removeEventListener('click', this.handleClick);
    this.element?.removeEventListener('input', this.handleInput);
  }
}
