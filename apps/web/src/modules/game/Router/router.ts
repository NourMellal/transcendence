import GamePage from '../pages/GamePage';
import CreateGamePage from '../pages/CreateGamePage';
import LocalGamePage from '../pages/LocalGamePage';
import { LobbyPage } from '../Pages/LobbyPage';

const routes = [
  {
    path: '/game',
    component: GamePage,
    props: {},
  },
  {
    path: '/game/create',
    component: CreateGamePage,
    props: {},
  },
  {
    path: '/game/local',
    component: LocalGamePage,
    props: {},
  },
  {
    path: '/game/lobby/:id',
    component: LobbyPage,
  },
];

export default routes;
