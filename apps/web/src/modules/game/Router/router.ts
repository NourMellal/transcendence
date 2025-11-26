import { LobbyPage } from '../Pages/LobbyPage';
import GamePage from '../pages/GamePage';

const routes = [
  {
    path: '/game',
    component: GamePage,
    props: {},
  },
  {
    path: '/game/lobby/:id',
    component: LobbyPage,
  },
];

export default routes;
