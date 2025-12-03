import Component from '@/core/Component';
import { navigate } from '@/routes';
import type { ChatMessage } from '@/models';
import { chatService } from '@/services/api/ChatService';

type Conversation = {
  userId: string;
  username: string;
  avatar?: string;
  unreadCount: number;
  lastMessage?: ChatMessage;
};

type State = {
  conversations: Conversation[];
  selectedUserId?: string;
  messages: Record<string, ChatMessage[]>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  messageInput: string;
  error?: string;
};

export default class ChatPage extends Component<Record<string, never>, State> {
  constructor(props: Record<string, never> = {}) {
    super(props);
  }

  getInitialState(): State {
    return {
      conversations: [],
      messages: {},
      selectedUserId: undefined,
      isLoadingConversations: true,
      isLoadingMessages: false,
      isSending: false,
      messageInput: '',
      error: undefined,
    };
  }

  onMount(): void {
    const friendIdFromQuery = this.getFriendIdFromQuery();
    void this.loadConversations(friendIdFromQuery);
  }

  private getFriendIdFromQuery(): string | undefined {
    try {
      const params = new URL(window.location.href).searchParams;
      return params.get('friendId') ?? undefined;
    } catch (_error) {
      return undefined;
    }
  }

  private async loadConversations(preselectUserId?: string): Promise<void> {
    this.setState({ isLoadingConversations: true, error: undefined });

    try {
      const conversations = await chatService.getConversations();
      const enhanced = [...conversations];
      if (
        preselectUserId &&
        !enhanced.some((conversation) => conversation.userId === preselectUserId)
      ) {
        enhanced.unshift({
          userId: preselectUserId,
          username: preselectUserId,
          unreadCount: 0,
        });
      }
      const selectedUserId =
        preselectUserId ??
        this.state.selectedUserId ??
        conversations[0]?.userId;

      this.setState({
        conversations: enhanced,
        selectedUserId,
        isLoadingConversations: false,
      });

      if (selectedUserId) {
        void this.loadMessages(selectedUserId);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load conversations.';
      this.setState({
        error: message,
        isLoadingConversations: false,
      });
    }
  }

  private async loadMessages(userId: string): Promise<void> {
    this.setState({ isLoadingMessages: true, error: undefined });

    try {
      const response = await chatService.getDirectMessages(userId, 1, 50);
      this.setState({
        messages: {
          ...this.state.messages,
          [userId]: response.data ?? [],
        },
        isLoadingMessages: false,
      });
      await chatService.markAsRead(userId).catch(() => undefined);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load messages.';
      this.setState({
        error: message,
        isLoadingMessages: false,
      });
    }
  }

  private getSelectedConversation(): Conversation | undefined {
    const { selectedUserId, conversations } = this.state;
    if (!selectedUserId) return undefined;
    return (
      conversations.find((c) => c.userId === selectedUserId) ?? {
        userId: selectedUserId,
        username: selectedUserId,
        unreadCount: 0,
      }
    );
  }

  private async handleSendMessage(): Promise<void> {
    if (!this.state.selectedUserId || !this.state.messageInput.trim()) return;
    if (this.state.isSending) return;

    const content = this.state.messageInput.trim();
    const recipientId = this.state.selectedUserId;

    this.setState({ isSending: true });

    try {
      const message = await chatService.sendDirectMessage(recipientId, content);
      const existing = this.state.messages[recipientId] ?? [];
      this.setState({
        messages: {
          ...this.state.messages,
          [recipientId]: [...existing, message],
        },
        messageInput: '',
        isSending: false,
      });
      await this.loadConversations(recipientId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to send message.';
      this.setState({
        error: message,
        isSending: false,
      });
    }
  }

  private handleConversationSelect(userId: string): void {
    if (userId === this.state.selectedUserId) return;
    this.setState({ selectedUserId: userId });
    if (!this.state.messages[userId]) {
      void this.loadMessages(userId);
    }
  }

  private renderConversations(): string {
    const { conversations, selectedUserId, isLoadingConversations, error } = this.state;

    if (isLoadingConversations) {
      return `<div class="text-sm text-white/60 p-4">Loading conversations...</div>`;
    }

    if (error && !conversations.length) {
      return `<div class="text-sm text-white/70 p-4">${error}</div>`;
    }

    if (!conversations.length) {
      return `<div class="text-sm text-white/60 p-4">No chats yet. Start a conversation from the dashboard.</div>`;
    }

    return conversations
      .map((conversation) => {
        const isActive = conversation.userId === selectedUserId;
        return `
          <button
            class="w-full text-left rounded-2xl p-4 flex flex-col gap-1 touch-feedback"
            data-action="select-conversation"
            data-user-id="${conversation.userId}"
            style="
              background: ${isActive ? 'rgba(0,217,255,0.12)' : 'rgba(255,255,255,0.03)'};
              border: 1px solid ${isActive ? 'rgba(0,217,255,0.4)' : 'rgba(255,255,255,0.05)'};
              color: white;
            "
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-lg">
                  ${conversation.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p class="font-semibold">${conversation.username}</p>
                  <p class="text-xs text-white/60">${conversation.lastMessage?.content ?? 'No messages yet'}</p>
                </div>
              </div>
              ${
                conversation.unreadCount > 0
                  ? `<span class="text-xs px-2 py-1 rounded-full" style="background: rgba(255,255,255,0.15);">${conversation.unreadCount}</span>`
                  : ''
              }
            </div>
          </button>
        `;
      })
      .join('');
  }

  private renderMessages(): string {
    const conversation = this.getSelectedConversation();

    if (!conversation) {
      return `<div class="flex items-center justify-center h-full text-white/50">Select a conversation to start chatting.</div>`;
    }

    const messages = this.state.messages[conversation.userId];

    if (this.state.isLoadingMessages && !messages) {
      return `<div class="flex items-center justify-center h-full text-white/60">Loading messages...</div>`;
    }

    if (!messages || !messages.length) {
      return `<div class="flex items-center justify-center h-full text-white/50">No messages yet. Say hi!</div>`;
    }

    return `
      <div class="flex flex-col gap-3">
        ${messages
          .map((message) => {
            const isMe = message.senderId !== conversation.userId;
            return `
              <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
                <div
                  class="max-w-xs sm:max-w-md px-4 py-3 rounded-2xl text-sm"
                  style="
                    background: ${isMe ? 'rgba(0,217,255,0.15)' : 'rgba(255,255,255,0.08)'};
                    border: 1px solid ${isMe ? 'rgba(0,217,255,0.3)' : 'rgba(255,255,255,0.08)'};
                    color: white;
                  "
                >
                  <p>${message.content}</p>
                  <p class="text-[10px] text-white/50 mt-1">${new Date(message.sentAt).toLocaleTimeString()}</p>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  render(): string {
    const conversation = this.getSelectedConversation();

    return `
      <div class="relative min-h-screen" style="background: var(--color-bg-dark);">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-darker)] to-[#050510]">
          <div class="absolute inset-0 opacity-40 cyberpunk-radial-bg"></div>
        </div>
        <div class="relative max-w-6xl mx-auto px-4 lg:px-0 py-8 space-y-6">
          <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p class="text-sm text-white/60">Social</p>
              <h1 class="text-3xl font-semibold">Chat</h1>
              <p class="text-sm text-white/50 mt-2">Stay connected with your pong friends.</p>
            </div>
            <div class="flex gap-3">
              <button
                data-action="go-dashboard"
                class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
                style="background: rgba(255,255,255,0.08); color: white;"
              >
                ← Dashboard
              </button>
              <button
                data-action="refresh-conversations"
                class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
                style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;"
              >
                Refresh
              </button>
            </div>
          </header>
          ${this.state.error && !this.state.isLoadingConversations ? `
            <div class="glass-panel p-4 text-sm text-white/70">${this.state.error}</div>
          ` : ''}
          <section class="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
            <aside class="glass-panel p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Conversations</h2>
                <span class="text-xs text-white/50">${this.state.conversations.length}</span>
              </div>
              ${this.renderConversations()}
            </aside>
            <div class="glass-panel p-4 flex flex-col min-h-[60vh]">
              <div class="pb-4 border-b border-white/10">
                <h2 class="text-lg font-semibold">${conversation?.username ?? 'No conversation'}</h2>
                <p class="text-xs text-white/50">${conversation ? 'Private chat' : 'Select a friend from the list.'}</p>
              </div>
              <div class="flex-1 overflow-y-auto py-4 space-y-3" id="chat-thread">
                ${this.renderMessages()}
              </div>
              <form data-action="send-message" class="mt-4 flex flex-col gap-3">
                <textarea
                  class="glass-input w-full rounded-2xl px-4 py-3 text-sm resize-none"
                  rows="3"
                  placeholder="${conversation ? 'Type your message...' : 'Select a conversation to chat.'}"
                  ${conversation ? '' : 'disabled'}
                >${this.state.messageInput}</textarea>
                <div class="flex justify-between items-center">
                  <button
                    type="submit"
                    class="btn-touch px-5 py-2 rounded-xl touch-feedback text-sm"
                    style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: white;"
                    ${conversation && !this.state.isSending ? '' : 'disabled'}
                  >
                    ${this.state.isSending ? 'Sending...' : 'Send'}
                  </button>
                  <button
                    type="button"
                    data-action="clear-input"
                    class="text-xs text-white/50 hover:text-white transition"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];

    if (!this.element) return;

    const bind = (selector: string, handler: (el: HTMLElement, event: Event) => void) => {
      const elements = this.element!.querySelectorAll<HTMLElement>(selector);
      elements.forEach((element) => {
        const wrapped = (event: Event) => {
          event.preventDefault();
          handler(element, event);
        };
        element.addEventListener('click', wrapped);
        this.subscriptions.push(() => element.removeEventListener('click', wrapped));
      });
    };

    bind('[data-action="go-dashboard"]', () => navigate('/dashboard'));
    bind('[data-action="refresh-conversations"]', () => {
      const friendId = this.state.selectedUserId;
      void this.loadConversations(friendId);
    });

    const conversationButtons = this.element.querySelectorAll<HTMLElement>('[data-action="select-conversation"]');
    conversationButtons.forEach((button) => {
      const handler = (event: Event) => {
        event.preventDefault();
        const userId = button.getAttribute('data-user-id');
        if (userId) {
          this.handleConversationSelect(userId);
        }
      };
      button.addEventListener('click', handler);
      this.subscriptions.push(() => button.removeEventListener('click', handler));
    });

    const form = this.element.querySelector<HTMLFormElement>('[data-action="send-message"]');
    if (form) {
      const handler = (event: Event) => {
        event.preventDefault();
        const textarea = form.querySelector<HTMLTextAreaElement>('textarea');
        if (textarea) {
          this.setState({ messageInput: textarea.value });
        }
        void this.handleSendMessage();
      };
      form.addEventListener('submit', handler);
      this.subscriptions.push(() => form.removeEventListener('submit', handler));

      const textarea = form.querySelector<HTMLTextAreaElement>('textarea');
      if (textarea) {
        const inputHandler = () => {
          this.setState({ messageInput: textarea.value });
        };
        textarea.addEventListener('input', inputHandler);
        this.subscriptions.push(() => textarea.removeEventListener('input', inputHandler));
      }
    }

    bind('[data-action="clear-input"]', () => {
      this.setState({ messageInput: '' });
    });
  }
}
