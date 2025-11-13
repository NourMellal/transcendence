import './styles/login-page.css';
import { Router } from './core/Router';
import { LoginPage } from './components/LoginPage';
import { AuthManager } from './components/auth/AuthManager';
import { HomePage } from './components/pages/HomePage';
import { GamePage } from './components/pages/GamePage';
import { ProfilePage } from './components/pages/ProfilePage';

/**
 * Main application entry point with SPA Router integration
 */

console.log('🚀 ft_transcendence Frontend Starting with SPA Router...');

const DEV: boolean = true;
let router: Router;

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

// Simulate authentication check
function isAuthenticated(): boolean {
  // For demo purposes, check if we have a token in localStorage
  return localStorage.getItem('auth_token') !== null;
}

// Authentication guard
function authGuard(): boolean {
  if (!isAuthenticated()) {
    // Redirect to login if not authenticated
    router.navigate('/auth/login', true);
    return false;
  }
  return true;
}

// Initialize the application with router
async function initializeApp(): Promise<void> {
  try {
    await startMockServer();
    console.log('📱 Initializing SPA Router and UI Components...');

    // Get the root container
    const app = document.getElementById('app');
    if (!app) {
      throw new Error('App container not found');
    }

    // Create router instance
    router = new Router(app);

    // Configure routes
    router
      .addRoute({
        path: '/',
        component: isAuthenticated() ? HomePage : LoginPage,
        title: 'Transcendence - Home'
      })
      .addRoute({
        path: '/home',
        component: HomePage,
        guard: authGuard,
        title: 'Transcendence - Dashboard'
      })
      .addRoute({
        path: '/game',
        component: GamePage,
        guard: authGuard,
        title: 'Transcendence - Game Arena'
      })
      .addRoute({
        path: '/profile',
        component: ProfilePage,
        guard: authGuard,
        title: 'Transcendence - Profile'
      })
      .addRoute({
        path: '/auth/login',
        component: LoginPage,
        title: 'Transcendence - Login'
      })
      .addRoute({
        path: '/auth/register',
        component: class extends AuthManager { 
          constructor() { super('register'); }
        },
        title: 'Transcendence - Register'
      });

    // Add demo authentication functionality
    setupDemoAuth();

    // Subscribe to route changes for debugging
    router.onRouteChange((route) => {
      console.log('📍 Route changed:', route);
    });

    console.log('✅ SPA Router initialized successfully!');
    console.log('🎯 Navigation ready - try changing the URL hash');

  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    showErrorPage(document.getElementById('app'));
  }
}

// Setup demo authentication for testing
function setupDemoAuth(): void {
  // Add demo login functionality to LoginPage components
  window.addEventListener('hashchange', () => {
    setTimeout(() => {
      const loginForm = document.querySelector('form');
      if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          
          // Simulate successful login
          localStorage.setItem('auth_token', 'demo_token_' + Date.now());
          console.log('🔐 Demo login successful');
          
          // Redirect to home
          router.navigate('/home');
        });
      }
    }, 100);
  });

  // Add logout functionality
  window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.textContent === 'Logout') {
      localStorage.removeItem('auth_token');
      console.log('🚪 Demo logout successful');
      router.navigate('/auth/login');
    }
  });
}

// Show error page
function showErrorPage(container: HTMLElement | null): void {
  if (!container) return;
  
  container.innerHTML = `
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
        <p style="color: #666; margin-bottom: 24px; line-height: 1.5;">
          Failed to load the application. Please refresh the page to try again.
        </p>
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

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}