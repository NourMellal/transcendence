import Component from '../../../core/Component';
import { GameCanvas } from '../components/GameCanvas';

type Props = {};
type State = {};

export default class GamePage extends Component<Props, State> {
  private gameCanvas: GameCanvas | null = null;

  constructor(props: Props = {}) {
    super(props);
  }

  getInitialState(): State {
    return {};
  }

  render(): string {
    return `
      <div class="min-h-screen flex items-center justify-center px-4 py-8" style="background: var(--color-bg-dark);">
        <div id="game-canvas-container"></div>
      </div>
    `;
  }

  onMount(): void {
    const container = this.element!.querySelector('#game-canvas-container') as HTMLElement;
    
    if (container) {
      this.gameCanvas = new GameCanvas({});
      this.gameCanvas.mount(container);
    }
  }

  protected attachEventListeners(): void {
    // No additional event listeners needed - GameCanvas handles its own
  }

  onUnmount(): void {
    if (this.gameCanvas) {
      this.gameCanvas.unmount();
      this.gameCanvas = null;
    }
  }
}
