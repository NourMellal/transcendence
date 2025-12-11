import LoginPage from '../Pages/LoginPage/LoginPage';
import SignupPage from '../Pages/SignupPage/SignupPage';
import OAuthCallbackPage from '../Pages/OAuthCallbackPage/OAuthCallbackPage';

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
  {
    path: '/oauth/callback',
    component: OAuthCallbackPage,
    props: {},
  },
];

export default routes;
