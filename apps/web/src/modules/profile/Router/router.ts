import ProfilePage from '../Pages/ProfilePage/ProfilePage';
import ManageFriendsPage from '../Pages/ManageFriendsPage/ManageFriendsPage';

const routes = [
  {
    path: '/profile',
    component: ProfilePage,
    props: {},
  },
  {
    path: '/friends/manage',
    component: ManageFriendsPage,
    props: {},
  },
  {
    path: '/settings',
    component: ProfilePage,
    props: {},
  },
];

export default routes;
