import LoginPage from '../Pages/LoginPage/LoginPage';
import SignupPage from '../Pages/SignupPage/SignupPage';

export const routes = [
  {
    path: '/auth/login',
    component: LoginPage,
    props: {},
  },
  {
    path: '/auth/signup',
    component: SignupPage,
    props: {},
  },
];

export default routes;