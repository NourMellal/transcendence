import authRoutes from './modules/auth/Router/router';
import homeRoutes from './modules/home/Router/router';
import gameRoutes from './modules/game/Router/router';
import profileRoutes from './modules/profile/Router/router';
import dashboardRoutes from './modules/dashboard/Router/router';
import Router from './core/Router';
import matchRoutes from './modules/matches/Router/router';
import leaderboardRoutes from './modules/leaderboard/Router/router';
import chatRoutes from './modules/chat/Router/router';
import tournamentRoutes from './modules/tournament/Router/router';

const routes = [
  ...homeRoutes,
  ...authRoutes,
  ...gameRoutes,
  ...profileRoutes,
  ...dashboardRoutes,
  ...matchRoutes,
  ...leaderboardRoutes,
  ...chatRoutes,
  ...tournamentRoutes,
];
export  const approuter = new Router(routes);

export function navigate(path: string) {
  approuter.navigate(path);
}

export function initRouter() {
  approuter.start();
}
