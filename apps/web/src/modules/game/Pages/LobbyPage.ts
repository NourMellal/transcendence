import { GameLobby } from '../components/GameLobby';

export class LobbyPage {
  private lobby: GameLobby;
  private element: HTMLElement;

  constructor(params: { id: string }) {
    this.lobby = new GameLobby({ gameId: params.id });
    this.element = document.createElement('div');
    this.element.appendChild(this.lobby.mount());
  }

  mount() {
    return this.element;
  }

  unmount() {
    this.lobby.unmount();
  }
}
