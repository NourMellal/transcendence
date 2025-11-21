import Router from "./core/Router";
import routes from "./modules/auth/Router/router";
import { mountRoot } from "./core/utils";

// Ensure the RootComponent is mounted and the `viewSignal` subscriber is active.
mountRoot();

const router = new Router(routes);
// start routing (handleNavigation will publish the view via viewSignal)
router.start();
