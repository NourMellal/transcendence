import { Component } from '@/components/base/Component';
import type { ChatMessagePayload } from '@/modules/shared/types/websocket.types';
import { gameRealtimeService } from '../services/GameRealtimeService';

interface ChatContext {
  gameId: string;
}

export class GameChatPanel extends Component {
  private messages: ChatMessagePayload[] = [];
  private subscription?: () => void;
  private context?: ChatContext;

  constructor(private readonly realtime = gameRealtimeService) {
    super('div', 'game-chat-panel');
  }

  setContext(context: ChatContext): void {
    this.context = context;
    if (this.mounted && !this.subscription) {
      this.subscribeToChat();
    }
  }

  override mount(parent: HTMLElement): void {
    super.mount(parent);
    if (!this.subscription) {
      this.subscribeToChat();
    }
  }

  protected render(): void {
    this.element.innerHTML = `
      <div class="game-chat-panel__header">
        <h3>Match Chat</h3>
      </div>
      <div class="game-chat-panel__messages">
        ${this.messages
          .map(
            (message) => `
              <div class="game-chat-panel__message">
                <span class="game-chat-panel__author">${message.senderUsername}</span>
                <span class="game-chat-panel__content">${message.content}</span>
                <span class="game-chat-panel__timestamp">${new Date(message.sentAt).toLocaleTimeString()}</span>
              </div>
            `
          )
          .join('')}
      </div>
      <form class="game-chat-panel__form">
        <input type="text" name="chatMessage" placeholder="Say something..." autocomplete="off" required />
        <button type="submit">Send</button>
      </form>
    `;

    const form = this.element.querySelector('.game-chat-panel__form') as HTMLFormElement | null;
    form?.addEventListener('submit', this.handleSubmit);
  }

  override cleanup(): void {
    this.subscription?.();
    this.subscription = undefined;
    super.cleanup();
  }

  private subscribeToChat(): void {
    if (!this.context?.gameId) {
      return;
    }

    this.subscription = this.realtime.subscribeToChat((payload) => {
      if (payload.gameId !== this.context?.gameId) {
        return;
      }
      this.messages = [...this.messages.slice(-20), payload];
      this.update();
    });
  }

  private handleSubmit = (event: Event): void => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const input = form.elements.namedItem('chatMessage') as HTMLInputElement;
    const value = input.value.trim();
    if (!value) {
      return;
    }
    this.realtime.sendChatMessage(value);
    input.value = '';
  };
}
