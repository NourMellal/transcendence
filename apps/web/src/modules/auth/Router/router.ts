import { homePage } from "../Pages";

// export route definitions for the auth module; main aggregator will merge these
export const routes = [
    {
        path: '/test/home',
        component: new homePage({ label: 'caca' }),
    },
];

export default routes;