import CreateGamePage from '../pages/CreateGamePage';
import LocalGamePage from '../pages/LocalGamePage';
import { LobbyPage } from '../Pages/LobbyPage';
import { PlayPage } from '../Pages/PlayPage';

const routes = [
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
  {
    path: '/game/play/:id',
    component: PlayPage,
  },
];

export default routes;
