import Component from '@/core/Component';
import type { Conversation } from '@/models';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: (conversationId: string) => void;
}

interface ConversationItemState {}

/**
 * ConversationItem Component
 * Displays a single conversation in the list
 */
export default class ConversationItem extends Component<ConversationItemProps, ConversationItemState> {
  constructor(props: ConversationItemProps) {
    super(props);
  }

  getInitialState(): ConversationItemState {
    return {};
  }

  onMount(): void {
    this.attachEventListeners();
  }

  protected attachEventListeners(): void {
    if (!this.element) return;

    const handleClick = () => {
      this.props.onClick(this.props.conversation.conversationId);
    };

    this.element.addEventListener('click', handleClick);
    this.subscriptions.push(() => {
      this.element?.removeEventListener('click', handleClick);
    });
  }

  /**
   * Get avatar URL or placeholder
   */
  private getAvatarUrl(): string {
    return this.props.conversation.recipientAvatar || '/assets/images/ape.png';
  }

  /**
   * Format last message preview
   */
  private getLastMessagePreview(): string {
    const { lastMessage } = this.props.conversation;
    if (!lastMessage) return 'No messages yet';
    
    const maxLength = 40;
    const invitePreview = this.getInvitePreview(lastMessage);
    const content = invitePreview ?? lastMessage.content;
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...' 
      : content;
  }

  private getInvitePreview(message: { type?: string; content?: string }): string | null {
    const messageType = message.type;
    if (messageType === 'INVITE') {
      try {
        const parsed = typeof message.content === 'string'
          ? JSON.parse(message.content)
          : message.content;
        const mode = parsed?.invitePayload?.mode;
        return mode ? `Game invite (${String(mode).toLowerCase()})` : 'Game invite';
      } catch (_error) {
        return 'Game invite';
      }
    }

    if (messageType === 'INVITE_ACCEPTED') {
      return 'Invite accepted';
    }

    if (messageType === 'INVITE_DECLINED') {
      return 'Invite declined';
    }

    return null;
  }

  /**
   * Format timestamp
   */
  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < 60000) {
      return 'Just now';
    } else if (diff < oneDay) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else if (diff < 2 * oneDay) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }

  render(): string {
    const { conversation, isActive } = this.props;
    const activeClass = isActive ? 'conversation-item--active' : '';
    const unreadClass = conversation.unreadCount > 0 ? 'conversation-item--unread' : '';

    const displayName = conversation.type === 'GAME' 
      ? `Game ${conversation.gameId?.substring(0, 8)}` 
      : conversation.recipientUsername || 'Unknown';

    return `
      <div class="conversation-item ${activeClass} ${unreadClass}" data-conversation-id="${conversation.conversationId}">
        <div class="conversation-item__avatar-wrapper">
          ${conversation.type === 'DIRECT' ? `
            <img src="${this.getAvatarUrl()}" alt="${displayName}" class="conversation-item__avatar" />
            ${conversation.isOnline ? '<span class="conversation-item__online-badge"></span>' : ''}
          ` : `
            <div class="conversation-item__avatar conversation-item__avatar--game">
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21.58 16.09l-1.09-7.66A5.5 5.5 0 0 0 15 3H9a5.5 5.5 0 0 0-5.49 5.43l-1.09 7.66a2.5 2.5 0 0 0 4.12 2.15l.62-.62a3 3 0 0 1 4.24 0l.62.62a2.5 2.5 0 0 0 4.12-2.15zM9 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
              </svg>
            </div>
          `}
        </div>
        <div class="conversation-item__content">
          <div class="conversation-item__header">
            <span class="conversation-item__name">${displayName}</span>
            ${conversation.lastMessage ? `
              <span class="conversation-item__time">${this.formatTime(conversation.lastMessage.timestamp || conversation.lastMessage.sentAt)}</span>
            ` : ''}
          </div>
          <div class="conversation-item__preview">
            ${this.getLastMessagePreview()}
          </div>
        </div>
        ${conversation.unreadCount > 0 ? `
          <div class="conversation-item__badge">${conversation.unreadCount}</div>
        ` : ''}
      </div>
    `;
  }
}
