import CreateTournamentPage from '../Pages/CreateTournamentPage/CreateTournamentPage';
import ListTournamentsPage from '../Pages/ListTournamentsPage/ListTournamentsPage';
import TournamentLobbyPage from '../Pages/TournamentLobbyPage/TournamentLobbyPage';

const routes = [
  {
    path: '/tournament/list',
    component: ListTournamentsPage,
    props: {},
  },
  {
    path: '/tournament/create',
    component: CreateTournamentPage,
    props: {},
  },
  {
    path: '/tournament/:id',
    component: TournamentLobbyPage,
    props: {},
  },
];

export default routes;
