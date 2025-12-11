import { mountRoot } from "./core/utils";
import { initRouter } from "./routes";
import "./styles/main.css";
import "./modules/chat/styles/chat.css";
import { authService } from "./services/auth/AuthService";
import { presenceManager } from "./services/presence/presence-manager";

console.log('🚀 Transcendence - Cyberpunk Edition');
console.log('🎨 Design system loaded');

// App bootstrap
(async () => {
  const app = document.querySelector<HTMLDivElement>('#app');

  if (app) {
    // Hydrate session before rendering
    await authService.hydrateFromStorage();
    presenceManager.initialize();

    // Mount root component
    mountRoot(app);
    // Initialize router
    initRouter();
    console.log('✅ Router initialized with proper architecture');
    console.log('📍 Routes: / (home), /auth/login, /auth/signup');
  } else {
    console.error('❌ Root element "#app" not found');
  }
})();
