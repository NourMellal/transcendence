import Component from '@/core/Component';

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping: () => void;
  disabled?: boolean;
  placeholder?: string;
}

interface MessageInputState {
  content: string;
}

/**
 * MessageInput Component
 * Input field for typing and sending messages
 */
export default class MessageInput extends Component<MessageInputProps, MessageInputState> {
  private typingTimeout: number | null = null;

  constructor(props: MessageInputProps) {
    super(props);
  }

  getInitialState(): MessageInputState {
    return {
      content: '',
    };
  }

  onMount(): void {
    this.attachEventListeners();
    this.focusInput();
  }

  onUpdate(): void {
    this.attachEventListeners();
  }

  private focusInput(): void {
    const input = this.element?.querySelector('.message-input__field') as HTMLTextAreaElement;
    if (input) {
      input.focus();
    }
  }

  protected attachEventListeners(): void {
    if (!this.element) return;

    const textarea = this.element.querySelector('.message-input__field') as HTMLTextAreaElement;
    const sendBtn = this.element.querySelector('.message-input__send-btn');

    if (textarea) {
      // Handle input changes
      const handleInput = (e: Event) => {
        const target = e.target as HTMLTextAreaElement;
        // Don't call setState to avoid re-render and losing focus
        // Just update internal state directly
        this.state.content = target.value;

        // Auto-resize textarea
        target.style.height = 'auto';
        target.style.height = Math.min(target.scrollHeight, 120) + 'px';

        // Update send button state
        this.updateSendButtonState(target.value);

        // Emit typing indicator
        if (target.value.trim()) {
          this.handleTyping();
        }
      };

      // Handle Enter key (send message)
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      };

      textarea.addEventListener('input', handleInput);
      textarea.addEventListener('keydown', handleKeyDown);

      this.subscriptions.push(() => {
        textarea.removeEventListener('input', handleInput);
        textarea.removeEventListener('keydown', handleKeyDown);
      });
    }

    if (sendBtn) {
      const handleSendClick = () => {
        this.handleSend();
      };

      sendBtn.addEventListener('click', handleSendClick);
      this.subscriptions.push(() => {
        sendBtn.removeEventListener('click', handleSendClick);
      });
    }
  }

  private updateSendButtonState(content: string): void {
    const sendBtn = this.element?.querySelector('.message-input__send-btn');
    if (!sendBtn) return;

    const canSend = content.trim().length > 0 && !this.props.disabled;
    
    if (canSend) {
      sendBtn.classList.add('message-input__send-btn--active');
      sendBtn.removeAttribute('disabled');
    } else {
      sendBtn.classList.remove('message-input__send-btn--active');
      sendBtn.setAttribute('disabled', 'true');
    }

    // Update character count if needed
    const charCount = content.length;
    const isNearLimit = charCount > 400;
    let charCountEl = this.element?.querySelector('.message-input__char-count');

    if (isNearLimit) {
      if (!charCountEl) {
        const container = this.element?.querySelector('.message-input');
        if (container) {
          charCountEl = document.createElement('div');
          charCountEl.className = `message-input__char-count ${charCount > 500 ? 'message-input__char-count--error' : ''}`;
          container.appendChild(charCountEl);
        }
      }
      if (charCountEl) {
        charCountEl.textContent = `${charCount}/500`;
        charCountEl.className = `message-input__char-count ${charCount > 500 ? 'message-input__char-count--error' : ''}`;
      }
    } else if (charCountEl) {
      charCountEl.remove();
    }
  }

  private handleTyping(): void {
    // Debounce typing indicator (emit max once per 300ms)
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.props.onTyping();

    this.typingTimeout = window.setTimeout(() => {
      this.typingTimeout = null;
    }, 300);
  }

  private handleSend(): void {
    const textarea = this.element?.querySelector('.message-input__field') as HTMLTextAreaElement;
    if (!textarea) return;

    const content = textarea.value.trim();
    
    if (!content || this.props.disabled) {
      return;
    }

    // Check character limit (500)
    if (content.length > 500) {
      alert('Message is too long. Maximum 500 characters allowed.');
      return;
    }

    // Send message
    this.props.onSend(content);

    // Clear input
    this.state.content = '';
    textarea.value = '';
    textarea.style.height = 'auto';
    
    // Update button state
    this.updateSendButtonState('');
  }

  render(): string {
    const { disabled = false, placeholder = 'Type a message...' } = this.props;
    const { content } = this.state;
    const canSend = content.trim().length > 0 && !disabled;
    const charCount = content.length;
    const isNearLimit = charCount > 400;

    return `
      <div class="message-input">
        <div class="message-input__container">
          <textarea 
            class="message-input__field" 
            placeholder="${placeholder}"
            ${disabled ? 'disabled' : ''}
            rows="1"
          ></textarea>
          <button 
            class="message-input__send-btn ${canSend ? 'message-input__send-btn--active' : ''}" 
            ${!canSend ? 'disabled' : ''}
            title="Send message (Enter)"
          >
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        ${isNearLimit ? `
          <div class="message-input__char-count ${charCount > 500 ? 'message-input__char-count--error' : ''}">
            ${charCount}/500
          </div>
        ` : ''}
      </div>
    `;
  }

  onUnmount(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }
}
