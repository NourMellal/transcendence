import Component from '@/core/Component';
import type { ChatMessage } from '@/models';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  typingUsername?: string;
  isLoading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

interface MessageListState {
  autoScroll: boolean;
}

/**
 * MessageList Component
 * Displays list of messages with infinite scroll
 */
export default class MessageList extends Component<MessageListProps, MessageListState> {
  private scrollContainer: HTMLElement | null = null;

  constructor(props: MessageListProps) {
    super(props);
  }

  getInitialState(): MessageListState {
    return {
      autoScroll: true,
    };
  }

  onMount(): void {
    this.scrollContainer = this.element?.querySelector('.message-list__messages') as HTMLElement;
    this.attachEventListeners();
    this.scrollToBottom();
  }

  onUpdate(): void {
    if (this.state.autoScroll) {
      this.scrollToBottom();
    }
  }

  protected attachEventListeners(): void {
    if (!this.scrollContainer) return;

    // Handle scroll for load more and auto-scroll detection
    const handleScroll = () => {
      if (!this.scrollContainer) return;

      const { scrollTop, scrollHeight, clientHeight } = this.scrollContainer;

      // Check if user scrolled to top (load more)
      if (scrollTop === 0 && this.props.hasMore && this.props.onLoadMore) {
        this.props.onLoadMore();
      }

      // Detect if user is at bottom (enable auto-scroll)
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      if (isAtBottom !== this.state.autoScroll) {
        this.setState({ autoScroll: isAtBottom });
      }
    };

    this.scrollContainer.addEventListener('scroll', handleScroll);
    this.subscriptions.push(() => {
      this.scrollContainer?.removeEventListener('scroll', handleScroll);
    });
  }

  private scrollToBottom(smooth = false): void {
    if (!this.scrollContainer) return;

    this.scrollContainer.scrollTo({
      top: this.scrollContainer.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  /**
   * Group messages by date
   */
  private groupMessagesByDate(messages: ChatMessage[]): Array<{ date: string; messages: ChatMessage[] }> {
    const groups: Record<string, ChatMessage[]> = {};

    messages.forEach((message) => {
      const timestamp = (message as any).createdAt || (message as any).timestamp || message.sentAt;
      const date = new Date(timestamp);
      
      // Handle invalid dates
      if (isNaN(date.getTime())) {
        return; // Skip messages with invalid dates
      }
      
      const dateKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return Object.entries(groups).map(([date, messages]) => ({ date, messages }));
  }

  render(): string | HTMLElement {
    const { messages, currentUserId, typingUsername, isLoading, hasMore } = this.props;

    const container = document.createElement('div');
    container.className = 'message-list';

    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'message-list__messages';

    if (isLoading && messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="message-list__loading">
          <div class="spinner"></div>
          <span>Loading messages...</span>
        </div>
      `;
    } else if (messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="message-list__empty">
          <svg width="64" height="64" fill="currentColor" opacity="0.2" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
          </svg>
          <p>No messages yet</p>
          <span class="text-muted">Send the first message</span>
        </div>
      `;
    } else {
      // Show load more indicator
      if (hasMore) {
        const loadMoreDiv = document.createElement('div');
        loadMoreDiv.className = 'message-list__load-more';
        loadMoreDiv.innerHTML = `
          <div class="spinner spinner--sm"></div>
          <span>Load older messages</span>
        `;
        messagesContainer.appendChild(loadMoreDiv);
      }

      // Group messages by date
      const groupedMessages = this.groupMessagesByDate(messages);

      groupedMessages.forEach(({ date, messages }) => {
        // Date separator
        const dateSeparator = document.createElement('div');
        dateSeparator.className = 'message-list__date-separator';
        dateSeparator.innerHTML = `<span>${date}</span>`;
        messagesContainer.appendChild(dateSeparator);

        // Messages for this date
        messages.forEach((message, index) => {
          const isOwn = message.senderId === currentUserId;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId;

          // Add isOwn to message for display
          const messageWithOwn = { ...message, isOwn: isOwn } as any;

          const bubble = new MessageBubble({
            message: messageWithOwn,
            isOwn,
            showAvatar,
          });

          const bubbleElement = document.createElement('div');
          const rendered = bubble.render();
          if (typeof rendered === 'string') {
            bubbleElement.innerHTML = rendered;
          } else {
            bubbleElement.appendChild(rendered);
          }
          messagesContainer.appendChild(bubbleElement);
        });
      });
    }

    // Typing indicator - show regardless of message count
    if (typingUsername) {
      const typingIndicator = new TypingIndicator({ username: typingUsername });
      const typingElement = document.createElement('div');
      const rendered = typingIndicator.render();
      if (typeof rendered === 'string') {
        typingElement.innerHTML = rendered;
      } else {
        typingElement.appendChild(rendered);
      }
      messagesContainer.appendChild(typingElement);
    }

    container.appendChild(messagesContainer);

    // Scroll to bottom button (shown when not at bottom)
    if (!this.state.autoScroll && messages.length > 0) {
      const scrollBtn = document.createElement('button');
      scrollBtn.className = 'message-list__scroll-btn';
      scrollBtn.innerHTML = `
        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
        </svg>
      `;
      scrollBtn.onclick = () => this.scrollToBottom(true);
      container.appendChild(scrollBtn);
    }

    return container;
  }
}
