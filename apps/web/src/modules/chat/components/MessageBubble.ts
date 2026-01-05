import Component from '@/core/Component';
import type { ChatMessage } from '@/models';
import { appState } from '@/state';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar?: boolean;
  onAcceptInvite?: (messageId: string) => void;
  onDeclineInvite?: (messageId: string) => void;
}

interface MessageBubbleState {
  countdown?: number;
  isExpired?: boolean;
  isResponding?: boolean;
}

interface InviteContent {
  kind: string;
  note?: string;
  invitePayload?: {
    mode?: string;
    map?: string;
    notes?: string;
    config?: Record<string, unknown>;
  };
}

/**
 * MessageBubble Component
 * Displays a single chat message with sender info and timestamp
 */
export default class MessageBubble extends Component<MessageBubbleProps, MessageBubbleState> {
  private countdownInterval: number | null = null;
  private readonly INVITE_TIMEOUT_SECONDS = 15;

  constructor(props: MessageBubbleProps) {
    super(props);
  }

  getInitialState(): MessageBubbleState {
    return {
      countdown: undefined,
      isExpired: false,
    };
  }

  onMount(): void {
    this.setupCountdown();
    this.attachEventListeners();
  }

  onUpdate(): void {
    this.attachEventListeners();
  }

  onUnmount(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private setupCountdown(): void {
    const { message } = this.props;
    const inviteContent = this.parseInviteContent();
    
    // Setup countdown for all invite messages
    if (!inviteContent) {
      return;
    }

    const messageTime = new Date((message as any).createdAt || (message as any).timestamp || message.sentAt).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - messageTime) / 1000);
    const remaining = Math.max(0, this.INVITE_TIMEOUT_SECONDS - elapsed);

    if (remaining === 0) {
      this.setState({ isExpired: true, countdown: 0 });
      return;
    }

    // Set initial countdown without triggering re-render
    this.state.countdown = remaining;

    this.countdownInterval = window.setInterval(() => {
      const currentRemaining = this.state.countdown || 0;
      if (currentRemaining <= 1) {
        // Only trigger re-render when expired to show "Expired" state or disable buttons
        this.setState({ countdown: 0, isExpired: true });
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
      } else {
        // Update countdown in state without re-rendering
        this.state.countdown = currentRemaining - 1;
        // Update DOM directly for smooth countdown
        this.updateCountdownDisplay(this.state.countdown);
      }
    }, 1000);
  }

  private updateCountdownDisplay(seconds: number): void {
    if (!this.element) return;
    
    const timerElement = this.element.querySelector('.message-bubble__invite-timer-value');
    if (timerElement) {
      timerElement.textContent = `${seconds}s`;
      // Add pulse animation on each tick
      timerElement.classList.remove('pulse');
      void (timerElement as HTMLElement).offsetWidth; // Force reflow
      timerElement.classList.add('pulse');
    }
  }

  protected attachEventListeners(): void {
    if (!this.element) return;

    const acceptBtn = this.element.querySelector('[data-action="accept-invite"]');
    const declineBtn = this.element.querySelector('[data-action="decline-invite"]');

    if (acceptBtn) {
      const handleAccept = (e: Event) => {
        if (this.state.isResponding) return;
        
        const target = e.target as HTMLElement;
        const messageId = target.getAttribute('data-message-id');
        if (messageId && this.props.onAcceptInvite) {
          this.setState({ isResponding: true });
          this.disableButtons();
          this.stopCountdown();
          this.props.onAcceptInvite(messageId);
        }
      };
      acceptBtn.addEventListener('click', handleAccept);
      this.subscriptions.push(() => acceptBtn.removeEventListener('click', handleAccept));
    }

    if (declineBtn) {
      const handleDecline = (e: Event) => {
        if (this.state.isResponding) return;
        
        const target = e.target as HTMLElement;
        const messageId = target.getAttribute('data-message-id');
        if (messageId && this.props.onDeclineInvite) {
          this.setState({ isResponding: true });
          this.disableButtons();
          this.stopCountdown();
          this.props.onDeclineInvite(messageId);
        }
      };
      declineBtn.addEventListener('click', handleDecline);
      this.subscriptions.push(() => declineBtn.removeEventListener('click', handleDecline));
    }
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private disableButtons(): void {
    if (!this.element) return;
    
    const acceptBtn = this.element.querySelector('[data-action="accept-invite"]') as HTMLButtonElement;
    const declineBtn = this.element.querySelector('[data-action="decline-invite"]') as HTMLButtonElement;
    
    if (acceptBtn) {
      acceptBtn.disabled = true;
      acceptBtn.style.opacity = '0.5';
      acceptBtn.style.cursor = 'not-allowed';
    }
    if (declineBtn) {
      declineBtn.disabled = true;
      declineBtn.style.opacity = '0.5';
      declineBtn.style.cursor = 'not-allowed';
    }
  }

  /**
   * Format timestamp to readable format
   */
  private formatTime(timestamp: string | undefined): string {
    if (!timestamp) {
      return '';
    }
    
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay) {
      // Same day - show time only
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else if (diff < 2 * oneDay) {
      // Yesterday
      return 'Yesterday ' + date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else {
      // Older - show date and time
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }) + ' ' + date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
  }

  /**
   * Get avatar URL or placeholder
   */
  private getAvatarUrl(): string {
    const avatar = (this.props.message as any).senderAvatar;
    return avatar || '/assets/images/ape.png';
  }

  /**
   * Check if message is an invite and parse content
   */
  private parseInviteContent(): InviteContent | null {
    const { message } = this.props;
    const messageType = (message as any).type;
    
    if (messageType !== 'INVITE') {
      return null;
    }

    try {
      const content = typeof message.content === 'string' 
        ? JSON.parse(message.content) 
        : message.content;
      
      if (content && content.kind === 'INVITE') {
        return content as InviteContent;
      }
    } catch (e) {
      // Not a valid invite JSON
    }
    
    return null;
  }

  /**
   * Check if message is an invite response (accepted/declined)
   */
  private isInviteResponse(): 'accepted' | 'declined' | null {
    const { message } = this.props;
    const messageType = (message as any).type;
    
    if (messageType === 'INVITE_ACCEPTED') {
      return 'accepted';
    } else if (messageType === 'INVITE_DECLINED') {
      return 'declined';
    }
    
    return null;
  }

  /**
   * Render invite response message (accepted/declined)
   */
  private renderInviteResponse(responseType: 'accepted' | 'declined'): string {
    const { message } = this.props;
    const senderName = message.senderUsername || 'Unknown';
    
    const icon = responseType === 'accepted' 
      ? '<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
      : '<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    
    const bgColor = responseType === 'accepted' 
      ? 'rgba(16, 185, 129, 0.15)'
      : 'rgba(239, 68, 68, 0.15)';
    
    const borderColor = responseType === 'accepted'
      ? 'rgba(16, 185, 129, 0.3)'
      : 'rgba(239, 68, 68, 0.3)';
    
    const textColor = responseType === 'accepted'
      ? '#10b981'
      : '#ef4444';
    
    const actionText = responseType === 'accepted' ? 'accepted' : 'declined';
    
    return `
      <div class="message-bubble__invite-response" style="background: ${bgColor}; border: 1px solid ${borderColor};">
        <div class="message-bubble__invite-response-icon" style="color: ${textColor};">
          ${icon}
        </div>
        <div class="message-bubble__invite-response-text">
          <strong>${this.escapeHtml(senderName)}</strong> ${actionText} the game invite
        </div>
      </div>
    `;
  }

  /**
   * Render invite card
   */
  private renderInviteCard(inviteContent: InviteContent): string {
    const { message, isOwn } = this.props ;
    const { countdown, isExpired } = this.state;
    const mode = inviteContent.invitePayload?.mode || 'classic';
    const map = inviteContent.invitePayload?.map;
    const notes = inviteContent.invitePayload?.notes;
    const messageId = message.id;
    const senderName = message.senderUsername || 'Unknown';
    const selfId = appState.auth.get().user?.id;
    const inviterDisplayName = !isOwn && message.senderId === selfId
      ? 'Someone'
      : senderName;
    const titleText = isOwn
      ? 'You invited them to a game'
      : `${this.escapeHtml(inviterDisplayName)} invited you to a game`;

    console.log('[MessageBubble] Rendering invite card:', {
      messageId,
      senderId: message.senderId,
      senderUsername: message.senderUsername,
      isOwn,
      senderName
    });

    return `
      <div class="message-bubble__invite-card">
        <div class="message-bubble__invite-header">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span class="message-bubble__invite-title">${titleText}</span>
        </div>
        <div class="message-bubble__invite-details">
          <div class="message-bubble__invite-mode">
            <strong>Mode:</strong> ${this.escapeHtml(mode)}
          </div>
          ${map ? `<div class="message-bubble__invite-map"><strong>Map:</strong> ${this.escapeHtml(map)}</div>` : ''}
          ${notes ? `<div class="message-bubble__invite-notes">${this.escapeHtml(notes)}</div>` : ''}
        </div>
        ${isOwn ? `
          <div class="message-bubble__invite-countdown">
            ${isExpired 
              ? '<span class="message-bubble__invite-expired">Expired</span>' 
              : `<span class="message-bubble__invite-timer">Expires in <strong class="message-bubble__invite-timer-value">${countdown}s</strong></span>`
            }
          </div>
        ` : `
          ${isExpired ? `
            <div class="message-bubble__invite-expired-actions">
              <span class="message-bubble__invite-expired">Invite Expired</span>
            </div>
          ` : `
            <div class="message-bubble__invite-actions">
              <button 
                 class="message-bubble__invite-btn message-bubble__invite-btn--accept" 
                 data-action="accept-invite"
                 data-message-id="${messageId}"
                 ${isExpired ? 'disabled' : ''}
              >
                Accept
              </button>
              <button 
                class="message-bubble__invite-btn message-bubble__invite-btn--decline" 
                data-action="decline-invite"
                data-message-id="${messageId}"
                ${isExpired ? 'disabled' : ''}
              >
                Decline
              </button>
            </div>
          `}
        `}
      </div>
    `;
  }

  render(): string {
    const { message, isOwn, showAvatar = true } = this.props;
    const alignClass = isOwn ? 'message-bubble--own' : 'message-bubble--other';
    const avatarHtml = showAvatar
      ? `<img src="${this.getAvatarUrl()}" alt="${message.senderUsername}" class="message-bubble__avatar" />`
      : '<div class="message-bubble__avatar-spacer"></div>';

    // Check if this is an invite message
    const inviteContent = this.parseInviteContent();
    const isInvite = inviteContent !== null;
    
    // Check if this is an invite response
    const responseType = this.isInviteResponse();
    const isResponse = responseType !== null;
     console.log(inviteContent) ;    
    return `
      <div class="message-bubble ${alignClass} ${isInvite ? 'message-bubble--invite' : ''} ${isResponse ? 'message-bubble--response' : ''}">
        ${!isOwn && showAvatar && !isResponse ? avatarHtml : ''}
        <div class="message-bubble__content">
          ${!isOwn && !isResponse ? `<div class="message-bubble__sender">${message.senderUsername}</div>` : ''}
          ${isInvite && inviteContent 
            ? this.renderInviteCard(inviteContent)
            : isResponse && responseType
              ? this.renderInviteResponse(responseType)
              : `<div class="message-bubble__text">${this.escapeHtml(message.content)}</div>`
          }
          ${!isResponse ? `<div class="message-bubble__time">${this.formatTime((message as any).createdAt || (message as any).timestamp || message.sentAt)}</div>` : ''}
        </div>
        ${isOwn && showAvatar && !isResponse ? avatarHtml : ''}
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
