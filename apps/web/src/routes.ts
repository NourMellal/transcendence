import authRoutes from './modules/auth/Router/router';
import Router from './core/Router';

const routes = [
        ...authRoutes,
      ];
const approuter = new Router(routes);
export default approuter;