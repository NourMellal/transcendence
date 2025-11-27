import Component from '@/core/Component';
import { GameLobby } from '../components/GameLobby';

interface LobbyPageProps {
  id: string;
}

/**
 * LobbyPage - Wrapper component for Game Lobby
 * 
 * Bridges the router and GameLobby component,
 * extracting route params and passing them as props.
 */
export class LobbyPage extends Component<LobbyPageProps, {}> {
  private lobby?: GameLobby;

  getInitialState() {
    return {};
  }

  render(): string {
    return `<div id="lobby-container"></div>`;
  }

  protected attachEventListeners(): void {
    // Event listeners are managed by GameLobby component
  }

  onMount(): void {
    const container = this.element?.querySelector('#lobby-container') as HTMLElement;
    if (container) {
      this.lobby = new GameLobby({ gameId: this.props.id });
      this.lobby.mount(container);
    }
  }

  onUnmount(): void {
    this.lobby?.onUnmount?.();
  }
}
