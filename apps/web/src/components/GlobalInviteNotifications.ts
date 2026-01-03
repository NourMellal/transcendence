import Component from '@/core/Component';
import { appState } from '@/state';
import { chatWebSocketService } from '@/services/api/ChatWebSocketService';
import { chatService } from '@/services/api/ChatService';
import { navigate } from '@/routes';

type PendingInvite = {
  inviteId: string;
  fromUserId: string;
  fromUsername: string;
  mode?: string;
  timestamp: string;
};

type State = {
  invites: PendingInvite[];
  processingInviteId?: string;
};

/**
 * Global Invite Notification Component
 * Shows incoming game invites as toast notifications regardless of current page
 * Mounted at app root level to persist across navigation
 */
export default class GlobalInviteNotifications extends Component<Record<string, never>, State> {
  private chatUnsubscribes: Array<() => void> = [];
  private cleanupTimeout?: number;

  getInitialState(): State {
    return {
      invites: [],
      processingInviteId: undefined,
    };
  }

  onMount(): void {
    this.setupChatConnection();
    
    // Cleanup old invites every 5 minutes
    this.cleanupTimeout = window.setInterval(() => {
      this.cleanupOldInvites();
    }, 5 * 60 * 1000);
  }

  onUnmount(): void {
    this.chatUnsubscribes.forEach((unsub) => unsub());
    this.chatUnsubscribes = [];
    
    if (this.cleanupTimeout) {
      clearInterval(this.cleanupTimeout);
    }
  }

  private setupChatConnection(): void {
    const auth = appState.auth.get();
    if (!auth.isAuthenticated || !auth.token) {
      console.log('[GlobalInvites] Not authenticated, skipping WebSocket setup');
      return;
    }

    // Connect to chat WebSocket if not already connected
    if (!chatWebSocketService.isConnected()) {
      console.log('[GlobalInvites] Connecting to chat WebSocket');
      chatWebSocketService.connect(auth.token);
    }

    // Listen for incoming invites
    const unsubMessage = chatWebSocketService.onMessage((message: any) => {
      if (message.type === 'INVITE' && message.senderId !== auth.user?.id) {
        console.log('[GlobalInvites] Received invite:', message);
        
        const invitePayload = message.invitePayload || {};
        const newInvite: PendingInvite = {
          inviteId: message.id,
          fromUserId: message.senderId,
          fromUsername: message.senderUsername || 'Friend',
          mode: invitePayload.mode,
          timestamp: message.createdAt || new Date().toISOString(),
        };
        
        // Add if not already present
        const exists = this.state.invites.some(inv => inv.inviteId === message.id);
        if (!exists) {
          this.setState({
            invites: [...this.state.invites, newInvite]
          });
        }
      }
    });

    // Listen for invite accepted (auto-cleanup)
    const unsubAccepted = chatWebSocketService.onInviteAccepted((data: any) => {
      console.log('[GlobalInvites] Invite accepted, navigating to lobby');
      // Remove invite and navigate
      this.removeInvite(data.inviteId);
      if (data.gameId) {
        navigate(`/game/lobby/${data.gameId}`);
      }
    });

    this.chatUnsubscribes.push(unsubMessage, unsubAccepted);
  }

  private async handleAccept(inviteId: string): Promise<void> {
    if (this.state.processingInviteId) {
      return; // Already processing an invite
    }

    this.setState({ processingInviteId: inviteId });

    try {
      const response = await chatService.acceptInvite(inviteId);
      
      if ((response as any).error) {
        throw new Error((response as any).error);
      }

      // Remove invite from list
      this.removeInvite(inviteId);

      // Navigate to lobby
      if (response.gameId) {
        navigate(`/game/lobby/${response.gameId}`);
      }
    } catch (error) {
      console.error('[GlobalInvites] Failed to accept invite:', error);
      const message = error instanceof Error ? error.message : 'Failed to accept invite';
      this.showError(message);
    } finally {
      this.setState({ processingInviteId: undefined });
    }
  }

  private async handleDecline(inviteId: string): Promise<void> {
    if (this.state.processingInviteId) {
      return;
    }

    this.setState({ processingInviteId: inviteId });

    try {
      await chatService.declineInvite(inviteId);
      this.removeInvite(inviteId);
    } catch (error) {
      console.error('[GlobalInvites] Failed to decline invite:', error);
    } finally {
      this.setState({ processingInviteId: undefined });
    }
  }

  private removeInvite(inviteId: string): void {
    this.setState({
      invites: this.state.invites.filter(inv => inv.inviteId !== inviteId)
    });
  }

  private cleanupOldInvites(): void {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.setState({
      invites: this.state.invites.filter(inv => {
        const inviteTime = new Date(inv.timestamp).getTime();
        return inviteTime > fiveMinutesAgo;
      })
    });
  }

  private showError(message: string): void {
    // Create temporary error toast
    const errorToast = document.createElement('div');
    errorToast.className = 'global-invite-error';
    errorToast.textContent = message;
    document.body.appendChild(errorToast);
    
    setTimeout(() => errorToast.remove(), 3000);
  }

  render(): string {
    const { invites, processingInviteId } = this.state;

    if (invites.length === 0) {
      return '<div id="global-invites" style="display: none;"></div>';
    }

    return `
      <div id="global-invites" class="global-invite-container">
        ${invites.map((invite, index) => {
          const isProcessing = processingInviteId === invite.inviteId;
          const mode = invite.mode === 'TOURNAMENT' ? 'Tournament' : '1v1';
          
          return `
            <div class="global-invite-toast" style="animation-delay: ${index * 0.1}s">
              <div class="global-invite-content">
                <div class="global-invite-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 2v4"></path>
                    <path d="M16 2v4"></path>
                    <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                    <path d="M3 10h18"></path>
                  </svg>
                </div>
                <div class="global-invite-text">
                  <p class="global-invite-title">${invite.fromUsername}</p>
                  <p class="global-invite-subtitle">invited you to play ${mode}</p>
                </div>
              </div>
              <div class="global-invite-actions">
                <button 
                  class="global-invite-btn global-invite-btn--accept"
                  data-action="accept-invite"
                  data-invite-id="${invite.inviteId}"
                  ${isProcessing ? 'disabled' : ''}
                >
                  ${isProcessing ? 'Processing...' : 'Accept'}
                </button>
                <button 
                  class="global-invite-btn global-invite-btn--decline"
                  data-action="decline-invite"
                  data-invite-id="${invite.inviteId}"
                  ${isProcessing ? 'disabled' : ''}
                >
                  ${isProcessing ? '' : '✕'}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];

    if (!this.element) return;

    // Accept invite
    const acceptButtons = this.element.querySelectorAll<HTMLElement>('[data-action="accept-invite"]');
    acceptButtons.forEach((btn) => {
      const handler = (e: Event) => {
        e.preventDefault();
        const inviteId = btn.getAttribute('data-invite-id');
        if (inviteId) {
          void this.handleAccept(inviteId);
        }
      };
      btn.addEventListener('click', handler);
      this.subscriptions.push(() => btn.removeEventListener('click', handler));
    });

    // Decline invite
    const declineButtons = this.element.querySelectorAll<HTMLElement>('[data-action="decline-invite"]');
    declineButtons.forEach((btn) => {
      const handler = (e: Event) => {
        e.preventDefault();
        const inviteId = btn.getAttribute('data-invite-id');
        if (inviteId) {
          void this.handleDecline(inviteId);
        }
      };
      btn.addEventListener('click', handler);
      this.subscriptions.push(() => btn.removeEventListener('click', handler));
    });
  }
}
