import './styles/login-page.css';
import { LoginPage } from './components/LoginPage.js';

/**
 * Main application entry point
 * Initialize the frontend application with impressive botanical login design
 */

console.log('🚀 ft_transcendence Frontend Starting...');
console.log('🎨 Loading beautiful botanical login design...');

// Initialize the application
async function initializeApp(): Promise<void> {
  try {
    console.log('📱 Initializing UI Components...');
    
    // Get the root container
    const app = document.getElementById('app');
    if (!app) {
      throw new Error('App container not found');
    }

    // Create and mount the impressive login page
    const loginPage = new LoginPage();
    loginPage.mount(app);
    
    console.log('✅ Login page mounted successfully!');
    console.log('🌺 Beautiful tropical botanical design loaded');
    console.log('🎯 Split-screen layout with modern form design ready');
    
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