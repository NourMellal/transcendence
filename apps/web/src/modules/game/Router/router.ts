import GameDemoPage from '../Pages/GameDemoPage/GameDemoPage';

const routes = [
  {
    path: '/game',
    component: GameDemoPage,
    props: {},
  },
  {
    path: '/game/:gameId',
    component: GameDemoPage,
    props: {},
  },
];

export default routes;
