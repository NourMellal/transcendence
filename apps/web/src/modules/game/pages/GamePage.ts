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
      <section class="game-page safe-area-inset">
        <header class="game-hero">
          <p class="game-hero__eyebrow">Realtime Arena</p>
          <h1>Cyber Pong Nexus</h1>
          <p>Low latency matches rendered at 60 FPS with server authoritative physics.</p>
          <div class="game-hero__stats">
            <div>
              <span>Ping</span>
              <strong>24 ms</strong>
            </div>
            <div>
              <span>Queue</span>
              <strong>~ 2 s</strong>
            </div>
            <div>
              <span>Players Online</span>
              <strong>1,348</strong>
            </div>
          </div>
        </header>

        <div class="game-stage glass-panel">
          <aside class="game-stage__side">
            <p class="game-stage__label">Challenger</p>
            <h3>Player One</h3>
            <p class="game-stage__meta">Mouse control · Neon Division</p>
            <ul>
              <li>Win rate: <strong>62%</strong></li>
              <li>Streak: <strong>+4</strong></li>
              <li>Power-ups: <strong>Precision</strong></li>
            </ul>
          </aside>

          <div class="game-stage__center">
            <div class="game-scoreboard glass-card">
              <div>
                <span>Player One</span>
                <strong>02</strong>
              </div>
              <div class="game-scoreboard__status">
                <span>Best of 5</span>
                <small>time elapsed 03:41</small>
              </div>
              <div>
                <span>Player Two</span>
                <strong>01</strong>
              </div>
            </div>
            <div id="game-canvas-container" class="game-stage__canvas"></div>
          </div>

          <aside class="game-stage__side">
            <p class="game-stage__label">Defender</p>
            <h3>Player Two</h3>
            <p class="game-stage__meta">Arrow keys · Plasma Circuit</p>
            <ul>
              <li>Win rate: <strong>58%</strong></li>
              <li>Streak: <strong>-1</strong></li>
              <li>Power-ups: <strong>Momentum</strong></li>
            </ul>
          </aside>
        </div>

        <div class="game-page__grid">
          <article class="glass-card">
            <h4>Controls</h4>
            <p>Left paddle uses <strong>W/S</strong>. Right paddle uses <strong>Arrow Up/Down</strong> or remote player input.</p>
            <ul>
              <li>W/S move your paddle without scrolling the page</li>
              <li>Space toggles pause (when available)</li>
              <li>Esc returns to the lobby</li>
            </ul>
          </article>
          <article class="glass-card">
            <h4>Match rules</h4>
            <p>First to 5 points wins. Rally speed increases by 5% every hit for extra tension.</p>
            <ul>
              <li>Boost orbs spawn every 15 seconds</li>
              <li>Server rewinds to keep physics authoritative</li>
              <li>Latency compensation up to 120 ms</li>
            </ul>
          </article>
          <article class="glass-card">
            <h4>Tips</h4>
            <p>Stay predictable and you’ll lose. Mix short bounces with wall banks.</p>
            <ul>
              <li>Watch the opponent paddle offset</li>
              <li>Use diagonal shots to force sprints</li>
              <li>Play the clock if you’re ahead</li>
            </ul>
          </article>
        </div>
      </section>
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
