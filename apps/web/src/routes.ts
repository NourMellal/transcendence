import authRoutes from './modules/auth/Router/router';
import Router from './core/Router';

const routes = [
  ...authRoutes,
];
export  const approuter = new Router(routes);

export function navigate(path: string) {
  approuter.navigate(path);
}

export function initRouter() {
  approuter.start();
}