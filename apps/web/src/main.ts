import { mountRoot } from "./core/utils";
import { initRouter } from "./routes";
import "./styles/main.css";
import "./styles/global-invites.css";
import "./modules/chat/styles/chat.css";
import { authService } from "./services/auth/AuthService";
import { presenceManager } from "./services/presence/presence-manager";
import { guestSessionService } from "./services/guest/GuestSessionService";
import GlobalInviteNotifications from "./components/GlobalInviteNotifications";

console.log('🚀 Transcendence - Cyberpunk Edition');
console.log('🎨 Design system loaded');

// App bootstrap
(async () => {
  const app = document.querySelector<HTMLDivElement>('#app');

  if (app) {
    // Hydrate guest + auth session before rendering
    guestSessionService.hydrateFromStorage();
    await authService.hydrateFromStorage();
    presenceManager.initialize();

    // Mount root component
    mountRoot(app);
    
    // Mount global invite notifications (persists across navigation)
    const globalInvites = new GlobalInviteNotifications({});
    const invitesContainer = document.createElement('div');
    invitesContainer.id = 'global-invites-mount';
    document.body.appendChild(invitesContainer);
    globalInvites.mount(invitesContainer);
    console.log('✅ Global invite notifications mounted');
    
    // Initialize router
    initRouter();
    console.log('✅ Router initialized with proper architecture');
    console.log('📍 Routes: / (home), /auth/login, /auth/signup');
  } else {
    console.error('❌ Root element "#app" not found');
  }
})();
