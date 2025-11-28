import { mountRoot } from "./core/utils";
import { initRouter } from "./routes";
import "./styles/main.css";

console.log('🚀 Transcendence - Cyberpunk Edition');
console.log('🎨 Design system loaded');

// App bootstrap
(() => {
  const app = document.querySelector<HTMLDivElement>('#app');

  if (app) {
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
