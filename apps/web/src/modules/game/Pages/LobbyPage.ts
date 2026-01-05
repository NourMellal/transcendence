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
  private mounted = false;

  getInitialState() {
    return {};
  }

  render(): string {  
    return `<div id="lobby-container" class="lobby-page-container" style="min-height: 100vh; width: 100%;"></div>`;
  }

  protected attachEventListeners(): void {
    // Event listeners are managed by GameLobby component
  }

  // Override shouldUpdate to prevent re-renders that would destroy GameLobby
  shouldUpdate(): boolean {
    return false;
  }

  onMount(): void {
    if (this.mounted) {
      return;
    }
    this.mounted = true;
    
    const container = this.element as HTMLElement | null;
    if (container) {
      this.lobby = new GameLobby({ gameId: this.props.id });
      this.lobby.mount(container);
    }
  }

  onUnmount(): void {
    this.mounted = false;
    this.lobby?.onUnmount?.();
  }
}
