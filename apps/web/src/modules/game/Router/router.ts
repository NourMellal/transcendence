import GamePage from '../pages/GamePage';
import CreateGamePage from '../pages/CreateGamePage';
import { LobbyPage } from '../Pages/LobbyPage';
import { PlayPage } from '../Pages/PlayPage';

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
    path: '/game/lobby/:id',
    component: LobbyPage,
  },
  {
    path: '/game/play/:id',
    component: PlayPage,
  },
];

export default routes;
