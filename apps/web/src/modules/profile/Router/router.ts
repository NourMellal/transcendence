import ProfilePage from '../Pages/ProfilePage/ProfilePage';
import ManageFriendsPage from '../Pages/ManageFriendsPage/ManageFriendsPage';
import PublicProfilePage from '../Pages/PublicProfilePage/PublicProfilePage';

const routes = [
  {
    path: '/profile',
    component: ProfilePage,
    props: {},
  },
  {
    path: '/profile/:userId',
    component: PublicProfilePage,
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
