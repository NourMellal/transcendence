import HomePage from '../Pages/HomePage/HomePage';
import { DashboardPage } from '../../../dashboard/pages/DashboardPage';

const routes = [
  {
    path: '/',
    component: HomePage,
    props: {},
  },
  {
    path: '/dashboard',
    component: DashboardPage,
    props: {},
  },
];

export default routes;
