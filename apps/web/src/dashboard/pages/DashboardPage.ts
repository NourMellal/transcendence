import { Component } from '../../components/base/Component';
import { GameList } from '../components/GameList';

/**
 * DashboardPage Component
 * Main dashboard page that displays available games and user stats
 */
export class DashboardPage extends Component {
  private gameListComponent: GameList | null = null;

  constructor() {
    super('div', 'dashboard-page w-full min-h-screen');
  }

  protected render(): void {
    this.element.innerHTML = this.renderContent();
  }

  private renderContent(): string {
    return `
      <div class="dashboard-container min-h-screen p-4 sm:p-6 lg:p-8">
        <!-- Page Header -->
        <div class="mb-8 space-y-2">
          <h1 class="text-4xl sm:text-5xl font-bold" style="color: var(--color-text);">
            Dashboard
          </h1>
          <p class="text-base sm:text-lg" style="color: var(--color-text-secondary);">
            Welcome back! Discover and join games with players around the world.
          </p>
        </div>

        <!-- Quick Stats (Optional) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div class="glass-panel p-4 rounded-xl" style="border: 1px solid var(--color-panel-border);">
            <p class="text-xs uppercase tracking-wider mb-2" style="color: var(--color-text-muted);">Available Games</p>
            <p class="text-2xl font-bold" style="color: var(--color-brand-secondary);">--</p>
          </div>
          <div class="glass-panel p-4 rounded-xl" style="border: 1px solid var(--color-panel-border);">
            <p class="text-xs uppercase tracking-wider mb-2" style="color: var(--color-text-muted);">Players Online</p>
            <p class="text-2xl font-bold" style="color: var(--color-text);">--</p>
          </div>
          <div class="glass-panel p-4 rounded-xl" style="border: 1px solid var(--color-panel-border);">
            <p class="text-xs uppercase tracking-wider mb-2" style="color: var(--color-text-muted);">Your Rank</p>
            <p class="text-2xl font-bold" style="color: var(--color-text);">--</p>
          </div>
        </div>

        <!-- Game List Mount Point -->
        <div id="game-list-mount"></div>
      </div>
    `;
  }

  mount(parent: HTMLElement): void {
    super.mount(parent);

    // Mount GameList component
    const mountPoint = this.element.querySelector('#game-list-mount') as HTMLElement;
    if (mountPoint) {
      this.gameListComponent = new GameList();
      this.gameListComponent.mount(mountPoint);
    }
  }

  unmount(): void {
    // Unmount child components
    if (this.gameListComponent) {
      this.gameListComponent.unmount();
    }
    super.unmount();
  }
}
