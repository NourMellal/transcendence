import Component from '@/core/Component';

interface TypingIndicatorProps {
  username: string;
}

interface TypingIndicatorState {}

/**
 * TypingIndicator Component
 * Shows animated typing indicator with username 
 */
export default class TypingIndicator extends Component<TypingIndicatorProps, TypingIndicatorState> {
  constructor(props: TypingIndicatorProps) {
    super(props);
  }

  getInitialState(): TypingIndicatorState {
    return {};
  }

  protected attachEventListeners(): void {
    // No event listeners needed for typing indicator
  }

  render(): string {
    return `
      <div class="typing-indicator">
        <span class="typing-indicator__text">${this.props.username} is typing</span>
        <div class="typing-indicator__dots">
          <span class="typing-indicator__dot"></span>
          <span class="typing-indicator__dot"></span>
          <span class="typing-indicator__dot"></span>
        </div>
      </div>
    `;
  }
}
