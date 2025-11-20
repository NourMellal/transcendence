import { Component } from '../base/Component';
import { Router } from '../../core/Router';
import { Signal } from '../../core/Signal';
import type { LandingOverview, GameStats } from '../../models';
import { GameService } from '../../services/api/GameService';
import type { AppState } from '../../state/AppState';

const defaultStats: GameStats = {
  activePlayers: 0,
  gamesPlayed: 0,
  tournaments: 0,
  matchmakingTime: 0,
  winRate: 0,
};

const defaultOverview: LandingOverview = {
  stats: defaultStats,
  liveMatches: [],
  tournaments: [],
};

export class HomePage extends Component {
  private overview = new Signal<LandingOverview>(defaultOverview);
  private subscriptionsBound = false;

  constructor(
    private state: AppState,
    private gameService: GameService,
    private router: Router
  ) {
    super('main', 'home-page bg-brand-dark text-white min-h-screen touch-device');
    
    // Add touch device detection for enhanced mobile experience
    this.detectTouchDevice();
    this.initialize();
  }

  private detectTouchDevice(): void {
    // Add touch device class for CSS targeting
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('touch-device');
    }
  }

  override mount(parent: HTMLElement): void {
    super.mount(parent);
    if (!this.subscriptionsBound) {
      this.setupReactiveSubscriptions();
      this.subscriptionsBound = true;
    }
  }

  protected render(): void {
    this.element.innerHTML = `
      <!-- Navigation - Mobile Optimized -->
      <nav class="mobile-nav fixed top-0 left-0 right-0 z-50 bg-brand-dark/80 backdrop-blur-xl border-b border-white/5 safe-area-top">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div class="text-lg sm:text-xl font-semibold tracking-tight">Transcendence</div>
          <div class="flex items-center gap-2 sm:gap-3">
            <button
              data-action="login"
              class="btn-touch px-3 sm:px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition touch-feedback"
            >
              Sign In
            </button>
            <button
              data-action="register"
              class="btn-touch px-4 sm:px-6 py-2 rounded-full bg-white/10 text-sm font-medium text-white hover:bg-white/20 border border-white/20 hover:border-white/40 transition touch-feedback"
            >
              <span class="hidden sm:inline">Create Account</span>
              <span class="sm:hidden">Sign Up</span>
            </button>
          </div>
        </div>
      </nav>

      <!-- Hero Section - Mobile Optimized -->
      <section class="relative min-h-screen flex items-center justify-center mobile-xs-px-4 px-6 landscape-mobile-adjust safe-area-inset pt-16">
        <!-- Cyberpunk background -->
        <div class="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-dark to-brand-dark">
          <div class="absolute inset-0 cyberpunk-radial-bg"></div>
        </div>

        <div class="relative max-w-4xl mx-auto text-center mobile-section-spacing">
          <!-- Main heading - Mobile Responsive -->
          <div class="space-y-4 sm:space-y-6 mb-8 sm:mb-12">
            <h1 class="text-responsive-hero sm:text-6xl lg:text-7xl font-light tracking-tight">
              <span class="block">The</span>
              <span class="block font-semibold bg-gradient-to-r from-white via-brand-secondary to-white bg-clip-text text-transparent">
                Bouncy
              </span>
              <span class="block">Pong Arena</span>
            </h1>
            <p class="text-responsive-subtitle sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mobile-xs-px-4">
              Low-key the best Pong experience, high-key addictive.
            </p>
          </div>

          <!-- Live stats - Mobile Grid -->
          <div class="grid grid-cols-2 mobile-sm-grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 max-w-2xl mx-auto mb-8 sm:mb-12">
            <div class="text-center space-y-1 sm:space-y-2">
              <div class="text-lg sm:text-2xl font-mono font-semibold" data-stat="activePlayers">0</div>
              <div class="text-xs sm:text-sm text-white/50">Online</div>
            </div>
            <div class="text-center space-y-1 sm:space-y-2">
              <div class="text-lg sm:text-2xl font-mono font-semibold" data-stat="gamesPlayed">0</div>
              <div class="text-xs sm:text-sm text-white/50">Games</div>
            </div>
            <div class="text-center space-y-1 sm:space-y-2">
              <div class="text-lg sm:text-2xl font-mono font-semibold" data-stat="tournaments">0</div>
              <div class="text-xs sm:text-sm text-white/50">Brackets</div>
            </div>
            <div class="text-center space-y-1 sm:space-y-2">
              <div class="text-lg sm:text-2xl font-mono font-semibold" data-stat="matchmakingTime">0s</div>
              <div class="text-xs sm:text-sm text-white/50">Queue</div>
            </div>
          </div>

          <!-- Call to action - Touch Optimized -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 sm:mb-12">
            <button
              data-action="play"
              class="btn-touch w-full sm:w-auto px-8 py-3 rounded-full bg-white text-brand-dark font-medium hover:scale-105 hover:bg-brand-secondary hover:text-white transition-all duration-200 touch-feedback"
            >
              Start Playing
            </button>
            <button
              data-action="watch"
              class="btn-touch w-full sm:w-auto px-8 py-3 rounded-full border border-white/20 font-medium text-white hover:border-white/60 hover:bg-white/5 transition touch-feedback"
            >
              Watch Matches
            </button>
          </div>

          <!-- Minimal game preview - Mobile Adapted -->
          <div class="relative max-w-sm sm:max-w-md mx-auto">
            <div class="glass-panel-mobile sm:glass-panel sm:p-8 border border-white/10">
              <div class="relative aspect-[3/2] bg-brand-dark rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden">
                <!-- Center line -->
                <div class="absolute inset-y-4 sm:inset-y-8 left-1/2 w-px bg-white/20"></div>
                
                <!-- Paddles -->
                <div class="absolute left-2 sm:left-4 top-1/2 h-8 sm:h-12 w-1 bg-brand-secondary rounded-full -translate-y-1/2 animate-pong-paddle-left"></div>
                <div class="absolute right-2 sm:right-4 top-1/2 h-8 sm:h-12 w-1 bg-brand-accent rounded-full -translate-y-1/2 animate-pong-paddle-right"></div>
                
                <!-- Ball -->
                <div class="absolute left-1/2 top-1/2 h-1.5 w-1.5 sm:h-2 sm:w-2 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 animate-pong-ball glow-primary"></div>
                
                <!-- Score -->
                <div class="absolute top-2 sm:top-4 left-0 right-0 text-center text-xs font-mono text-white/60">
                  Live Preview
                </div>
              </div>
              <div class="mt-3 sm:mt-4 text-center text-xs text-white/40">
                Signal-powered real-time gameplay
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer - Mobile Optimized -->
      <footer class="relative mobile-xs-px-4 px-6 py-8 sm:py-16 safe-area-bottom">
        <div class="max-w-4xl mx-auto text-center mobile-section-spacing">
          <div class="space-y-3 sm:space-y-4">
            <h2 class="text-responsive-title sm:text-3xl font-light">Ready to compete?</h2>
            <p class="text-white/60 mobile-xs-px-4">Join the most precise Pong experience ever created.</p>
          </div>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 sm:mt-8">
            <button
              data-action="register"
              class="btn-touch w-full sm:w-auto px-8 py-3 rounded-full bg-brand-primary text-white font-medium hover:bg-brand-secondary transition touch-feedback"
            >
              Create Free Account
            </button>
            <button
              data-action="login"
              class="btn-touch w-full sm:w-auto px-8 py-3 rounded-full border border-white/20 text-white font-medium hover:border-white/40 hover:bg-white/5 transition touch-feedback"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
    `;

    this.mountStatCards();
    this.setupEventListeners();
  }

  private mountStatCards(): void {
    // Stats are already displayed inline in the hero section
    // No separate mounting needed for minimal design
  }

  private setupEventListeners(): void {
    // Navigation buttons
    const loginButtons = this.element.querySelectorAll('[data-action="login"]');
    loginButtons.forEach(button => {
      this.addEventListener(button as HTMLElement, 'click', () => this.router.navigate('/auth/login'));
    });

    const registerButtons = this.element.querySelectorAll('[data-action="register"]');
    registerButtons.forEach(button => {
      this.addEventListener(button as HTMLElement, 'click', () => this.router.navigate('/auth/signup'));
    });

    // Action buttons
    const playButtons = this.element.querySelectorAll('[data-action="play"]');
    playButtons.forEach(button => {
      this.addEventListener(button as HTMLElement, 'click', () => {
        // Check if user is authenticated, otherwise redirect to login
        if (this.state.user.get()) {
          this.router.navigate('/game');
        } else {
          this.router.navigate('/auth/login');
        }
      });
    });

    const watchButton = this.element.querySelector('[data-action="watch"]');
    if (watchButton) {
      this.addEventListener(watchButton as HTMLElement, 'click', () => this.router.navigate('/tournaments'));
    }
  }

  private setupReactiveSubscriptions(): void {
    this.registerCleanup(
      this.overview.subscribe((overview) => {
        this.state.gameStats.set(overview.stats);
        this.updateStatCards(overview.stats);
      })
    );
  }

  private updateStatCards(stats: GameStats): void {
    // Update inline stats in hero section
    const activePlayersNode = this.element.querySelector<HTMLElement>('[data-stat="activePlayers"]');
    const gamesPlayedNode = this.element.querySelector<HTMLElement>('[data-stat="gamesPlayed"]');
    const tournamentsNode = this.element.querySelector<HTMLElement>('[data-stat="tournaments"]');
    const matchmakingNode = this.element.querySelector<HTMLElement>('[data-stat="matchmakingTime"]');

    if (activePlayersNode) activePlayersNode.textContent = stats.activePlayers.toString();
    if (gamesPlayedNode) gamesPlayedNode.textContent = stats.gamesPlayed.toLocaleString();
    if (tournamentsNode) tournamentsNode.textContent = stats.tournaments.toString();
    if (matchmakingNode) matchmakingNode.textContent = `${stats.matchmakingTime}s`;
  }

  private async initialize(): Promise<void> {
    this.state.isLoading.set(true);
    try {
      const overview = await this.gameService.getLandingOverview();
      this.overview.set(overview);
    } catch (error) {
      console.error('Failed to load landing overview', error);
    } finally {
      this.state.isLoading.set(false);
    }
  }
}

