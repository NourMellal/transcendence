import Component from '@/core/Component';
import type { ChatMessage } from '@/models';
import { lobbyChatHelpers, lobbyChatState } from '@/state/lobbyChat.state';
import { lobbyChatService } from '../services/LobbyChatService';

interface LobbyChatPanelProps {
  gameId: string;
}

interface LobbyChatPanelState {
  messages: ChatMessage[];
  typingUsers: string[];
  isOpen: boolean;
  unreadCount: number;
  status: 'idle' | 'connecting' | 'connected';
  error?: string;
  input: string;
}

export class LobbyChatPanel extends Component<LobbyChatPanelProps, LobbyChatPanelState> {
  getInitialState(): LobbyChatPanelState {
    return {
      messages: [],
      typingUsers: [],
      isOpen: false,
      unreadCount: 0,
      status: 'idle',
      error: undefined,
      input: '',
    };
  }

  async onMount(): Promise<void> {
    this.subscriptions.push(
      lobbyChatState.subscribe((state) => {
        this.setState({
          messages: state.messages,
          typingUsers: Object.values(state.typingUsers).map((t) => t.username),
          isOpen: state.isOpen,
          unreadCount: state.unreadCount,
          status: state.isConnecting ? 'connecting' : state.isConnected ? 'connected' : 'idle',
          error: state.error,
        });
      })
    );

    await lobbyChatService.connect(this.props.gameId);
  }

  onUnmount(): void {
    lobbyChatService.disconnect();
  }

  dispose(): void {
    const el = this.element;
    this.unmount();
    if (el && el.parentElement) {
      el.parentElement.removeChild(el);
    }
    this.element = null;
  }

  render(): string {
    const { isOpen, unreadCount, messages, typingUsers, status, error } = this.state;
    const unreadBadge =
      unreadCount > 0 ? `<span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">${unreadCount}</span>` : '';
    const statusText =
      status === 'connecting'
        ? 'Connecting...'
        : status === 'connected'
          ? 'Live'
          : 'Offline';

    return `
      <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-2">
        <button
          type="button"
          class="relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
          style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;"
          data-action="toggle"
        >
          <span>💬</span>
          ${unreadBadge}
        </button>

        <div
          class="w-80 max-w-[90vw] rounded-xl shadow-2xl overflow-hidden transform transition-all duration-200"
          style="background: var(--color-panel-bg); border: 1px solid var(--color-panel-border); ${isOpen ? 'opacity:1; pointer-events:auto; translate: 0' : 'opacity:0; pointer-events:none; translate: 0 8px;'}"
          data-panel
        >
          <div class="px-4 py-3 flex items-center justify-between" style="background: var(--color-panel-border);">
            <div>
              <p class="text-sm font-semibold" style="color: var(--color-text-primary);">Lobby Chat</p>
              <p class="text-xs" style="color: var(--color-text-secondary);">${statusText}</p>
            </div>
            <button class="text-sm" style="color: var(--color-text-secondary);" data-action="close">✕</button>
          </div>

          <div class="h-64 flex flex-col" style="background: var(--color-panel-bg);">
            <div class="flex-1 overflow-y-auto px-3 py-2 space-y-2" data-messages>
              ${messages.length === 0 ? '<p class="text-center text-xs" style="color: var(--color-text-secondary);">No messages yet</p>' : messages.map((msg) => this.renderMessage(msg)).join('')}
            </div>
            ${
              typingUsers.length
                ? `<div class="px-3 pb-1 text-xs" style="color: var(--color-text-secondary);">${typingUsers.join(', ')} typing...</div>`
                : ''
            }
            <div class="border-t px-3 py-2 flex items-center space-x-2">
              <input
                type="text"
                value="${this.state.input ?? ''}"
                data-input
                class="flex-1 text-sm px-3 py-2 rounded-lg"
                style="background: var(--color-input-bg); color: var(--color-text-primary); border: 1px solid var(--color-panel-border);"
                placeholder="Say hello..."
              />
              <button
                class="text-sm px-3 py-2 rounded-lg"
                style="background: var(--color-primary); color: white;"
                data-action="send"
              >
                Send
              </button>
            </div>
            ${error ? `<div class="px-3 pb-2 text-xs text-red-500">${error}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    if (!this.element) return;

    const toggle = this.element.querySelector('[data-action="toggle"]');
    const close = this.element.querySelector('[data-action="close"]');
    const send = this.element.querySelector('[data-action="send"]');
    const input = this.element.querySelector<HTMLInputElement>('[data-input]');
    const messagesEl = this.element.querySelector<HTMLElement>('[data-messages]');

    toggle?.addEventListener('click', () => {
      lobbyChatHelpers.setOpen(!this.state.isOpen);
      if (!this.state.isOpen) {
        setTimeout(() => this.scrollToBottom(messagesEl), 0);
      }
    });
    close?.addEventListener('click', () => lobbyChatHelpers.setOpen(false));

    send?.addEventListener('click', () => {
      this.handleSend(input);
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleSend(input);
      } else {
        lobbyChatService.sendTyping();
      }
    });

    if (messagesEl) {
      setTimeout(() => this.scrollToBottom(messagesEl), 0);
    }
  }

  private handleSend(input?: HTMLInputElement | null): void {
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    lobbyChatService.sendMessage(text);
    input.value = '';
    this.state.input = '';
  }

  private renderMessage(msg: ChatMessage): string {
    const isOwn = (msg as any).isOwn;
    const time = new Date((msg as any).createdAt || (msg as any).timestamp || Date.now()).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `
      <div class="flex ${isOwn ? 'justify-end' : 'justify-start'}">
        <div class="max-w-[85%] px-3 py-2 rounded-lg text-sm" style="background:${isOwn ? 'var(--color-primary)' : 'var(--color-panel-border)'}; color:${isOwn ? 'white' : 'var(--color-text-primary)'};">
          <div class="text-[11px] opacity-80 mb-1">${msg.senderUsername ?? 'Player'} · ${time}</div>
          <div>${this.escape(msg.content)}</div>
        </div>
      </div>
    `;
  }

  private scrollToBottom(el?: HTMLElement | null): void {
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  private escape(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }
}
