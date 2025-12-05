import Component from '@/core/Component';
import { GameCanvas } from '../components/GameCanvas';

interface PlayPageProps {
  id: string;
}

/**
 * Online play page: mounts GameCanvas in authoritative-server mode
 * using the gameId provided by the router params.
 */
export class PlayPage extends Component<PlayPageProps, {}> {
  private canvas?: GameCanvas;

  getInitialState() {
    return {};
  }

  render(): string {
    return `
      <div class="relative min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12 safe-area-inset" style="background: var(--color-bg-dark);">
        <div class="absolute inset-0 cyberpunk-radial-bg"></div>
        <div class="relative w-full max-w-5xl">
          <div class="text-center mb-6 sm:mb-8">
            <h1 class="text-3xl sm:text-4xl font-bold tracking-tight" style="color: var(--color-text-primary);">
              ⚡ Live Match
            </h1>
            <p class="text-sm sm:text-base" style="color: var(--color-text-secondary);">
              Server-authoritative Pong — keep this tab focused for lowest latency.
            </p>
          </div>
          <div class="glass-panel p-4 sm:p-6" style="border: 2px solid var(--color-panel-border); box-shadow: var(--shadow-glass), var(--shadow-glow-primary);">
            <div id="play-canvas-container" class="rounded-lg overflow-hidden aspect-[4/3]"></div>
          </div>
        </div>
      </div>
    `;
  }

  onMount(): void {
    const container = this.element?.querySelector('#play-canvas-container') as HTMLElement | null;
    if (container) {
      this.canvas = new GameCanvas({ gameId: this.props.id });
      this.canvas.mount(container);
    }
  }

  onUnmount(): void {
    this.canvas?.unmount();
    this.canvas = undefined;
  }

  // No-op: Play page has no local listeners; canvas handles its own.
  protected attachEventListeners(): void {}
}
