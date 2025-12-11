import Component from '@/core/Component';
import type { ChatMessage } from '@/models';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar?: boolean;
}

interface MessageBubbleState {}

/**
 * MessageBubble Component
 * Displays a single chat message with sender info and timestamp
 */
export default class MessageBubble extends Component<MessageBubbleProps, MessageBubbleState> {
  constructor(props: MessageBubbleProps) {
    super(props);
  }

  getInitialState(): MessageBubbleState {
    return {};
  }

  protected attachEventListeners(): void {
    // No event listeners needed for static message bubble
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

  render(): string {
    const { message, isOwn, showAvatar = true } = this.props;
    const alignClass = isOwn ? 'message-bubble--own' : 'message-bubble--other';
    const avatarHtml = showAvatar
      ? `<img src="${this.getAvatarUrl()}" alt="${message.senderUsername}" class="message-bubble__avatar" />`
      : '<div class="message-bubble__avatar-spacer"></div>';

    return `
      <div class="message-bubble ${alignClass}">
        ${!isOwn && showAvatar ? avatarHtml : ''}
        <div class="message-bubble__content">
          ${!isOwn ? `<div class="message-bubble__sender">${message.senderUsername}</div>` : ''}
          <div class="message-bubble__text">${this.escapeHtml(message.content)}</div>
          <div class="message-bubble__time">${this.formatTime((message as any).createdAt || (message as any).timestamp || message.sentAt)}</div>
        </div>
        ${isOwn && showAvatar ? avatarHtml : ''}
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
