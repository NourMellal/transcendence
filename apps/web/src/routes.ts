import authRoutes from './modules/auth/Router/router';
import homeRoutes from './modules/home/Router/router';
import gameRoutes from './modules/game/Router/router';
import Router from './core/Router';

const routes = [
  ...homeRoutes,
  ...authRoutes,
  ...gameRoutes,
];
export  const approuter = new Router(routes);

export function navigate(path: string) {
  approuter.navigate(path);
}

export function initRouter() {
  approuter.start();
}
