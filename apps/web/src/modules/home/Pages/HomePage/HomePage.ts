import Component from '../../../../core/Component';
import { navigate } from '../../../../routes';
import { appState } from '../../../../state';

type Props = {};
type State = {
  activePlayers: number;
  gamesPlayed: number;
  tournaments: number;
  isAuthenticated: boolean;
};

export default class HomePage extends Component<Props, State> {
  private authUnsubscribe?: () => void;

  constructor(props: Props = {}) {
    super(props);
  }

  getInitialState(): State {
    const auth = appState.auth.get();
    return {
      activePlayers: 1337,
      gamesPlayed: 42069,
      tournaments: 420,
      isAuthenticated: auth.isAuthenticated,
    };
  }

  onMount(): void {
    this.authUnsubscribe = appState.auth.subscribe((auth) => {
      if (auth.isAuthenticated !== this.state.isAuthenticated) {
        this.setState({ isAuthenticated: auth.isAuthenticated });
      }
    });
  }

  onUnmount(): void {
    this.authUnsubscribe?.();
  }

  render() {
    const { activePlayers, gamesPlayed, tournaments } = this.state;
    const showAuthHeader = !this.state.isAuthenticated;

    return `
      ${showAuthHeader ? `
        <nav class="mobile-nav fixed top-0 left-0 right-0 z-50 glass-panel safe-area-top" style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div class="text-lg sm:text-xl font-semibold tracking-tight">Transcendence</div>
            <div class="flex items-center gap-2 sm:gap-3">
              <button
                data-action="login"
                class="btn-touch px-3 sm:px-4 py-2 text-sm font-medium transition touch-feedback"
                style="color: rgba(255, 255, 255, 0.8);"
              >
                Sign In
              </button>
              <button
                data-action="register"
                class="btn-touch px-4 sm:px-6 py-2 rounded-full text-sm font-medium transition touch-feedback"
                style="background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2);"
              >
                <span class="hidden sm:inline">Create Account</span>
                <span class="sm:hidden">Sign Up</span>
              </button>
            </div>
          </div>
        </nav>
      ` : ''}

      <section class="relative min-h-screen flex items-center justify-center px-4 sm:px-6 pt-20 sm:pt-24 pb-12 landscape-mobile-adjust safe-area-inset">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-dark)] to-[var(--color-bg-darker)]">
          <div class="absolute inset-0 cyberpunk-radial-bg"></div>
        </div>

        <div class="relative max-w-4xl mx-auto text-center space-y-8 sm:space-y-12 mobile-section-spacing">
          <div class="space-y-4 sm:space-y-6">
            <h1 class="text-responsive-hero sm:text-6xl lg:text-7xl font-light tracking-tight" style="color: var(--color-text-primary);">
              <span class="block">The</span>
              <span class="block font-semibold" style="background: linear-gradient(to right, white, var(--color-brand-secondary), white); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                Bouncy
              </span>
              <span class="block">Pong Arena</span>
            </h1>
            <p class="text-responsive-subtitle sm:text-xl max-w-2xl mx-auto leading-relaxed mobile-xs-px-4 text-white/60">
              Low-key the best Pong experience, high-key addictive.
            </p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 max-w-2xl mx-auto mb-8 sm:mb-12">
            <div class="text-center space-y-1 sm:space-y-2">
              <div class="text-lg sm:text-2xl font-mono font-semibold">${activePlayers.toLocaleString()}</div>
              <div class="text-xs sm:text-sm text-white/50">Online</div>
            </div>
            <div class="text-center space-y-1 sm:space-y-2">
              <div class="text-lg sm:text-2xl font-mono font-semibold">${gamesPlayed.toLocaleString()}</div>
              <div class="text-xs sm:text-sm text-white/50">Games</div>
            </div>
            <div class="text-center space-y-1 sm:space-y-2">
              <div class="text-lg sm:text-2xl font-mono font-semibold">${tournaments}</div>
              <div class="text-xs sm:text-sm text-white/50">Brackets</div>
            </div>
            <div class="text-center space-y-1 sm:space-y-2">
              <div class="text-lg sm:text-2xl font-mono font-semibold">~2s</div>
              <div class="text-xs sm:text-sm text-white/50">Queue</div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
            <button
              data-action="play-now"
              class="btn-touch w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-300 touch-feedback hover:scale-105"
              style="background: white; color: var(--color-bg-dark);"
              onmouseover="this.style.background='var(--color-brand-secondary)'; this.style.color='white';"
              onmouseout="this.style.background='white'; this.style.color='var(--color-bg-dark)';"
            >
              Play Now
            </button>
            <button
              data-action="watch-live"
              class="btn-touch w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-300 touch-feedback"
              style="border: 2px solid rgba(255, 255, 255, 0.2); color: white; background: transparent;"
            >
              Watch Live
            </button>
          </div>

          <!-- Minimal game preview - Mobile Adapted -->
          <div class="relative max-w-sm sm:max-w-md mx-auto mb-8 sm:mb-12">
            <div class="glass-panel-mobile sm:glass-panel sm:p-8" style="border: 1px solid rgba(255, 255, 255, 0.1);">
              <div class="relative aspect-[3/2] rounded-xl sm:rounded-2xl overflow-hidden" style="background: var(--color-bg-dark); border: 1px solid rgba(255, 255, 255, 0.1);">
                <!-- Center line -->
                <div class="absolute inset-y-4 sm:inset-y-8 left-1/2 w-px" style="background: rgba(255, 255, 255, 0.2);"></div>
                
                <!-- Paddles -->
                <div class="absolute left-2 sm:left-4 top-1/2 h-8 sm:h-12 w-1 rounded-full animate-pong-paddle-left" style="background: var(--color-brand-secondary);"></div>
                <div class="absolute right-2 sm:right-4 top-1/2 h-8 sm:h-12 w-1 rounded-full animate-pong-paddle-right" style="background: var(--color-brand-accent);"></div>
                
                <!-- Ball -->
                <div class="absolute left-1/2 top-1/2 h-1.5 w-1.5 sm:h-2 sm:w-2 bg-white rounded-full animate-pong-ball glow-primary"></div>
                
                <!-- Score -->
                <div class="absolute top-2 sm:top-4 left-0 right-0 text-center text-xs font-mono" style="color: rgba(255, 255, 255, 0.6);">
                  Live Preview
                </div>
              </div>
              <div class="mt-3 sm:mt-4 text-center text-xs" style="color: rgba(255, 255, 255, 0.4);">
                Real-time gameplay powered by WebSockets
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16 px-4">
            <div class="text-center p-6 rounded-xl transition-all touch-feedback" style="border: 1px solid rgba(255, 255, 255, 0.1);">
              <div class="text-3xl sm:text-4xl mb-3">⚡</div>
              <h3 class="font-semibold mb-2 text-sm sm:text-base" style="color: var(--color-text-primary);">Real-time Multiplayer</h3>
              <p class="text-xs sm:text-sm" style="color: var(--color-text-muted);">Play against friends or matchmake with players worldwide</p>
            </div>
            <div class="text-center p-6 rounded-xl transition-all touch-feedback" style="border: 1px solid rgba(255, 255, 255, 0.1);">
              <div class="text-3xl sm:text-4xl mb-3">🏆</div>
              <h3 class="font-semibold mb-2 text-sm sm:text-base" style="color: var(--color-text-primary);">Tournaments</h3>
              <p class="text-xs sm:text-sm" style="color: var(--color-text-muted);">Compete in tournaments and climb the leaderboard</p>
            </div>
            <div class="text-center p-6 rounded-xl transition-all touch-feedback" style="border: 1px solid rgba(255, 255, 255, 0.1);">
              <div class="text-3xl sm:text-4xl mb-3">📊</div>
              <h3 class="font-semibold mb-2 text-sm sm:text-base" style="color: var(--color-text-primary);">Stats & Analytics</h3>
              <p class="text-xs sm:text-sm" style="color: var(--color-text-muted);">Track your progress with detailed statistics</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer - Mobile Optimized -->
      <footer class="relative px-4 sm:px-6 py-8 sm:py-16 safe-area-bottom">
        <div class="max-w-4xl mx-auto text-center">
          <div class="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            <h2 class="text-2xl sm:text-3xl font-light" style="color: var(--color-text-primary);">Ready to compete?</h2>
            <p class="px-4" style="color: var(--color-text-secondary);">Join the most precise Pong experience ever created.</p>
          </div>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              data-action="register-footer"
              class="btn-touch w-full sm:w-auto px-8 py-3 rounded-full font-medium transition touch-feedback"
              style="background: var(--color-brand-primary); color: white;"
            >
              Create Free Account
            </button>
            <button
              data-action="login-footer"
              class="btn-touch w-full sm:w-auto px-8 py-3 rounded-full font-medium transition touch-feedback"
              style="border: 1px solid rgba(255, 255, 255, 0.2); color: white;"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
    `;
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];

    if (!this.element) return;

    // Navigation to login
    const loginBtns = this.element.querySelectorAll('[data-action="login"], [data-action="login-footer"]');
    loginBtns.forEach(btn => {
      const handler = (e: Event) => {
        e.preventDefault();
        navigate('/auth/login');
      };
      btn.addEventListener('click', handler);
      this.subscriptions.push(() => btn.removeEventListener('click', handler));
    });

    // Navigation to signup
    const registerBtns = this.element.querySelectorAll('[data-action="register"], [data-action="register-footer"]');
    registerBtns.forEach(btn => {
      const handler = (e: Event) => {
        e.preventDefault();
        navigate('/auth/signup');
      };
      btn.addEventListener('click', handler);
      this.subscriptions.push(() => btn.removeEventListener('click', handler));
    });

    // Play button
    const playBtn = this.element.querySelector('[data-action="play-now"]');
    if (playBtn) {
      const handler = () => {
        navigate('/game/create');
      };
      playBtn.addEventListener('click', handler);
      this.subscriptions.push(() => playBtn.removeEventListener('click', handler));
    }

    // Watch live button
    const watchBtn = this.element.querySelector('[data-action="watch-live"]');
    if (watchBtn) {
      const handler = () => {
        // TODO: Navigate to live matches when ready
        console.log('Watch live matches - TODO: implement matches route');
      };
      watchBtn.addEventListener('click', handler);
      this.subscriptions.push(() => watchBtn.removeEventListener('click', handler));
    }

    // Touch device detection
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('touch-device');
    }
  }
}
