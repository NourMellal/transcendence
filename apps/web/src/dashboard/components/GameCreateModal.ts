import { Component } from '../../components/base/Component';
import { gameService } from '../../services/api/GameService';
import type { GameDTOs } from '../../models';

/**
 * GameCreateModal Component
 * Modal for creating a new game with customizable settings
 */
export class GameCreateModal extends Component {
  private scoreLimit = 11;
  private ballSpeed = 5; // normal speed
  private isLoading = false;
  private error: string | null = null;
  
  // Callback for when game is created
  public onGameCreated?: (gameId: string) => void;
  // Callback for when modal is closed
  public onClose?: () => void;

  constructor() {
    super('div', 'game-create-modal fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4');
  }

  protected render(): void {
    this.element.innerHTML = this.renderContent();
    this.attachEventListeners();
  }

  private renderContent(): string {
    return `
      <div class="modal-overlay absolute inset-0" data-action="close-modal"></div>
      
      <div class="modal-content glass-panel p-6 sm:p-8 rounded-2xl w-full max-w-md relative z-10" style="border: 1px solid var(--color-panel-border);">
        <!-- Close Button -->
        <button 
          data-action="close"
          class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-all btn-touch"
          style="background: var(--color-panel-bg); color: var(--color-text);"
        >
          ✕
        </button>

        <!-- Header -->
        <div class="mb-6">
          <h2 class="text-2xl font-bold" style="color: var(--color-text);">
            🎮 Create New Game
          </h2>
          <p class="text-sm mt-1" style="color: var(--color-text-secondary);">
            Customize your game settings
          </p>
        </div>

        <!-- Error State -->
        ${this.error ? `
          <div class="error-banner p-3 rounded-lg mb-4" style="background: rgba(255, 7, 58, 0.1); border: 1px solid rgba(255, 7, 58, 0.2); color: var(--color-error); font-size: 0.875rem;">
            ${this.error}
          </div>
        ` : ''}

        <form id="create-game-form" class="space-y-5">
          <!-- Score Limit Section -->
          <div class="space-y-3">
            <label class="block text-sm font-semibold" style="color: var(--color-text);">
              🎯 Score Limit
            </label>
            
            <div class="grid grid-cols-3 gap-2">
              ${[5, 11, 21].map(score => `
                <button
                  type="button"
                  data-score="${score}"
                  class="score-option btn-touch py-2 px-3 rounded-lg font-semibold transition-all text-sm ${
                    this.scoreLimit === score 
                      ? 'ring-2' 
                      : 'opacity-70 hover:opacity-100'
                  }"
                  style="
                    background: ${this.scoreLimit === score ? 'var(--color-brand-secondary)' : 'var(--color-panel-bg)'};
                    color: var(--color-text);
                    ${this.scoreLimit === score ? 'box-shadow: var(--shadow-neon); border: none;' : 'border: 1px solid var(--color-panel-border);'}
                  "
                >
                  ${score}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Ball Speed Section -->
          <div class="space-y-3">
            <label class="block text-sm font-semibold" style="color: var(--color-text);">
              ⚡ Ball Speed
            </label>
            
            <div class="space-y-2">
              ${[
                { label: 'Slow', value: 3, emoji: '🐢' },
                { label: 'Normal', value: 5, emoji: '⚡' },
                { label: 'Fast', value: 8, emoji: '🚀' }
              ].map(speed => `
                <label class="flex items-center p-2 rounded-lg cursor-pointer transition-all btn-touch" 
                  style="
                    background: ${this.ballSpeed === speed.value ? 'var(--color-brand-secondary)' : 'var(--color-panel-bg)'};
                    border: 1px solid ${this.ballSpeed === speed.value ? 'var(--color-brand-secondary)' : 'var(--color-panel-border)'};
                  "
                >
                  <input 
                    type="radio" 
                    name="ballSpeed" 
                    value="${speed.value}"
                    data-speed="${speed.value}"
                    ${this.ballSpeed === speed.value ? 'checked' : ''}
                    class="sr-only"
                  />
                  <span class="w-4 h-4 rounded-full border-2 mr-3 flex-shrink-0" 
                    style="border-color: ${this.ballSpeed === speed.value ? 'var(--color-text-primary)' : 'var(--color-text-muted)'}; background: ${this.ballSpeed === speed.value ? 'var(--color-brand-secondary)' : 'transparent'};"></span>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm" style="color: var(--color-text);">${speed.emoji} ${speed.label}</p>
                  </div>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 pt-4">
            <button 
              type="button"
              data-action="cancel"
              class="btn-touch flex-1 py-2 px-3 rounded-lg font-semibold transition-all text-sm"
              style="background: var(--color-panel-bg); color: var(--color-text); border: 1px solid var(--color-panel-border);"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn-touch flex-1 py-2 px-3 rounded-lg font-semibold transition-all text-sm ${this.isLoading ? 'opacity-50 cursor-not-allowed' : ''}"
              style="background: var(--color-brand-secondary); color: var(--color-text-primary);"
              ${this.isLoading ? 'disabled' : ''}
            >
              ${this.isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  private attachEventListeners(): void {
    const form = this.element.querySelector('#create-game-form') as HTMLFormElement;
    if (form) {
      this.addEventListener(form, 'submit', this.handleSubmit.bind(this));
    }

    // Score limit buttons
    const scoreButtons = this.element.querySelectorAll('[data-score]');
    scoreButtons.forEach(btn => {
      this.addEventListener(btn as HTMLElement, 'click', (e) => {
        e.preventDefault();
        const score = parseInt((btn as HTMLElement).dataset.score!);
        this.scoreLimit = score;
        this.render();
      });
    });

    // Ball speed radio buttons
    const speedRadios = this.element.querySelectorAll('input[name="ballSpeed"]');
    speedRadios.forEach(radio => {
      this.addEventListener(radio as HTMLElement, 'change', (e) => {
        const speed = parseInt((e.target as HTMLInputElement).value);
        this.ballSpeed = speed;
        this.render();
      });
    });

    // Cancel button
    const cancelBtn = this.element.querySelector('[data-action="cancel"]') as HTMLElement;
    if (cancelBtn) {
      this.addEventListener(cancelBtn, 'click', (e) => {
        e.preventDefault();
        this.close();
      });
    }

    // Close button
    const closeBtn = this.element.querySelector('[data-action="close"]') as HTMLElement;
    if (closeBtn) {
      this.addEventListener(closeBtn, 'click', (e) => {
        e.preventDefault();
        this.close();
      });
    }

    // Overlay click to close
    const overlay = this.element.querySelector('[data-action="close-modal"]') as HTMLElement;
    if (overlay) {
      this.addEventListener(overlay, 'click', (e) => {
        e.preventDefault();
        this.close();
      });
    }
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (this.isLoading) return;

    this.isLoading = true;
    this.error = null;
    this.render();

    try {
      const request: GameDTOs.CreateGameRequest = {
        gameType: 'pong',
        settings: {
          maxScore: this.scoreLimit,
          ballSpeed: this.ballSpeed
        }
      };

      const response = await gameService.createGame(request);
      const gameId = response.game.id;

      // Call callback
      this.onGameCreated?.(gameId);
      this.close();
    } catch (error: any) {
      console.error('Failed to create game:', error);
      
      // Check if it's a 404 (backend not implemented yet)
      if (error?.status === 404) {
        this.error = '⚠️ Backend API not ready yet. Contact the game-service developer to implement POST /api/games endpoint.';
      } else {
        this.error = error?.message || 'Failed to create game. Please try again.';
      }
      
      this.isLoading = false;
      this.render();
    }
  }

  public close(): void {
    this.onClose?.();
    this.unmount();
  }
}
