import { mountRoot } from "./core/utils";
import { initRouter } from "./routes";
import "./styles/main.css";

console.log('🚀 Transcendence - Cyberpunk Edition');
console.log('🎨 Design system loaded');

// Initialize MSW for API mocking in development
(async () => {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { worker } = await import('./mocks/browser');
      await worker.start({
        onUnhandledRequest: 'bypass', // Allow unhandled requests to go through
      });
      console.log('🛠️ Mock Service Worker initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize MSW:', error);
    }
  }

  // Mount root component
  const app = document.querySelector<HTMLDivElement>('#app');
  if (app) {
    mountRoot(app);
    
    // Initialize router
    initRouter();
    
    console.log('✅ Router initialized with proper architecture');
    console.log('📍 Routes: / (home), /auth/login, /auth/signup');
  }
})();
