import './styles/main.css';

import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { HomePage } from './components/pages/HomePage';
import { ComingSoonPage } from './components/pages/ComingSoonPage';
import { Router } from './core/Router';
import { createAppState } from './state/AppState';
import { gameService } from './services/api/GameService';

/**
 * Main application entry point
 * Initialize the Transcendence frontend application with cyberpunk design
 */

console.log('🚀 ft_transcendence Frontend Starting...');
console.log('🎨 Loading cyberpunk gaming experience...');

const DEV: boolean = true;
async function startMockServer(): Promise<void> {
  if (!DEV) {
    return;
  }

  try {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
      onUnhandledRequest: 'bypass',
    });
    console.log('🛠️ MSW worker started (development only)');
  } catch (error) {
    console.warn('⚠️ Failed to start MSW worker:', error);
  }
}

async function initializeApp(): Promise<void> {
  try {
    await startMockServer();
    console.log('📱 Initializing UI Components...');

    const app = document.getElementById('app');
    if (!app) {
      throw new Error('App container not found');
    }

    const state = createAppState();
    const router = new Router(app);

    router
      .addRoute({
        path: '/',
        component: () => new HomePage(state, gameService, router),
        title: 'Transcendence | Competitive Pong Platform',
      })
      .addRoute({
        path: '/auth/login',
        component: () => new LoginPage(router),
        title: 'Login | Transcendence',
      })
      .addRoute({
        path: '/auth/signup',
        component: () => new SignupPage(router),
        title: 'Join Transcendence',
      })
      .addRoute({
        path: '/game',
        component: () =>
          new ComingSoonPage({
            title: 'Matchmaking Hub is docking soon',
            description: 'Queue for duels, practice arenas, and scrims from this hub shortly.',
          }),
        title: 'Play | Transcendence',
      })
      .addRoute({
        path: '/tournaments',
        component: () =>
          new ComingSoonPage({
            title: 'Tournament HQ is under construction',
            description: 'Track brackets, analyst decks, and casting seats here soon.',
          }),
        title: 'Tournaments | Transcendence',
      })
      .addRoute({
        path: '/profile',
        component: () =>
          new ComingSoonPage({
            title: 'Profile Labs launching soon',
            description: 'Showcase badges, stats, and achievements once this lab opens.',
          }),
        title: 'Profile | Transcendence',
      })
      .setNotFound('/');

    router.start();

    console.log('✅ Router initialized and routes registered');
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);

    // Show error message to user
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
          text-align: center;
          font-family: 'Inter', system-ui, sans-serif;
          background: linear-gradient(135deg, #40c4c4, #4a9e7e);
          color: white;
        ">
          <div style="
            background: white;
            color: #1a1a1a;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.16);
            max-width: 400px;
            width: 100%;
          ">
            <h1 style="color: #dc3545; margin-bottom: 16px; font-size: 24px;">❌ Application Error</h1>
            <p style="color: #666; margin-bottom: 24px; line-height: 1.5;">Failed to load the application. Please refresh the page to try again.</p>
            <button
              onclick="window.location.reload()"
              style="
                background: #40c4c4;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 600;
                transition: background 0.2s ease;
              "
              onmouseover="this.style.background='#36a9a9'"
              onmouseout="this.style.background='#40c4c4'"
            >
              🔄 Refresh Page
            </button>
          </div>
        </div>
      `;
    }
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
