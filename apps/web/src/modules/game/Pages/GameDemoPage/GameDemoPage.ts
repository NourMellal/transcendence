import Component from '../../../../core/Component';
import { GameScreen } from '../../components/GameScreen';
import type { GameScreenContext } from '../../components/GameScreen';

type Props = Record<string, never>;
type State = Record<string, never>;

export default class GameDemoPage extends Component<Props, State> {
  private readonly screen = new GameScreen();

  constructor(props: Props = {}) {
    super(props);
  }

  getInitialState(): State {
    return {};
  }

  render(): string {
    return `
      <div class="game-demo-page min-h-screen bg-gray-900 text-white flex flex-col">
        <header class="p-4 sm:p-6 flex items-center justify-between bg-gray-950 border-b border-gray-800">
          <div>
            <p class="text-sm text-gray-400">Realtime Demo</p>
            <h1 class="text-2xl font-semibold">Live Game Preview</h1>
          </div>
          <button data-action="back" class="py-2 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition text-sm font-medium">
            ← Back
          </button>
        </header>
        <main class="flex-1 overflow-hidden p-4 sm:p-8">
          <div data-game-root class="h-full w-full bg-gray-900 rounded-2xl border border-gray-800"></div>
        </main>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];

    if (!this.element) return;

    const backButton = this.element.querySelector('[data-action="back"]') as HTMLButtonElement | null;
    if (backButton) {
      const handler = (e: Event) => {
        e.preventDefault();
        history.back();
      };
      backButton.addEventListener('click', handler);
      this.subscriptions.push(() => backButton.removeEventListener('click', handler));
    }
  }

  onMount(): void {
    this.mountGameScreen();
  }

  onUnmount(): void {
    this.screen.unmount();
  }

  private mountGameScreen(): void {
    if (!this.element) {
      return;
    }

    const target = this.element.querySelector('[data-game-root]') as HTMLElement | null;
    if (!target) {
      return;
    }

    this.screen.setContext(this.resolveContext());
    this.screen.mount(target);
  }

  private resolveContext(): GameScreenContext {
    const params = new URLSearchParams(window.location.search);
    const gameIdFromQuery = params.get('gameId');
    const routeParams = (this as any).params as Record<string, string> | undefined;
    const gameId = gameIdFromQuery || routeParams?.gameId || 'demo-match';

    return {
      gameId,
      playerId: 'demo-player',
      username: 'Demo Player',
      side: 'left',
    };
  }
}
