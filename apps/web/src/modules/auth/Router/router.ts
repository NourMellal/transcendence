import { homePage, LoginPage } from "../Pages";

export const routes = [
  {
    path: '/home',
    component: homePage,    // constructor, not instance
    props: { label: 'caca' },
  },
  {
    path: '/login',
    component: LoginPage,   // constructor, not instance
    props: {},
  },
];

export default routes;