import GamePage from '../pages/GamePage';
import { LobbyPage } from '../Pages/LobbyPage';

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
