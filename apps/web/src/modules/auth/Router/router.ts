import { homePage, LoginPage } from "../Pages";

export const routes = [
    {
        path: '/home',
        component: new homePage({ label: 'caca' }),
    },  
    {  
        path : '/login'  ,  
        component : new LoginPage({}) ,  
    }
];

export default routes;