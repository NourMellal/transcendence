import Signal from '@/core/signal';
import type { ChatMessage } from '@/models';

export interface LobbyChatState {
  gameId?: string;
  messages: ChatMessage[];
  typingUsers: Record<string, { username: string; lastSeen: number }>;
  isOpen: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  unreadCount: number;
  error?: string;
}

const initialState: LobbyChatState = {
  gameId: undefined,
  messages: [],
  typingUsers: {},
  isOpen: false,
  isConnecting: false,
  isConnected: false,
  unreadCount: 0,
  error: undefined,
};

export const lobbyChatState = new Signal<LobbyChatState>(initialState);

const getState = (): LobbyChatState => lobbyChatState.get();
const setState = (state: LobbyChatState): void => lobbyChatState.set(state);

export const lobbyChatHelpers = {
  setGame(gameId: string | undefined) {
    const state = getState();
    setState({ ...state, gameId });
  },

  setConnecting(isConnecting: boolean) {
    const state = getState();
    setState({ ...state, isConnecting, isConnected: false });
  },

  setConnected(isConnected: boolean) {
    const state = getState();
    setState({ ...state, isConnected, isConnecting: false, error: undefined });
  },

  setOpen(isOpen: boolean) {
    const state = getState();
    setState({ ...state, isOpen, unreadCount: isOpen ? 0 : state.unreadCount });
  },

  setError(error?: string) {
    const state = getState();
    setState({ ...state, error, isConnecting: false });
  },

  setMessages(messages: ChatMessage[]) {
    const state = getState();
    const sorted = [...messages].sort((a, b) => {
      const aTime = new Date((a as any).createdAt || (a as any).timestamp || (a as any).sentAt).getTime();
      const bTime = new Date((b as any).createdAt || (b as any).timestamp || (b as any).sentAt).getTime();
      return aTime - bTime;
    });

    setState({
      ...state,
      messages: sorted,
      unreadCount: state.isOpen ? 0 : state.unreadCount,
    });
  },

  addMessage(message: ChatMessage) {
    const state = getState();
    const exists = state.messages.some((m) => m.id === message.id);
    if (exists) {
      return;
    }
    const messages = [...state.messages, message].sort((a, b) => {
      const aTime = new Date((a as any).createdAt || (a as any).timestamp || (a as any).sentAt).getTime();
      const bTime = new Date((b as any).createdAt || (b as any).timestamp || (b as any).sentAt).getTime();
      return aTime - bTime;
    });

    const unreadCount =
      !state.isOpen && !(message as any).isOwn ? state.unreadCount + 1 : state.unreadCount;

    setState({
      ...state,
      messages,
      unreadCount,
    });
  },

  setTyping(userId: string, username: string, isTyping: boolean) {
    const state = getState();
    const typingUsers = { ...state.typingUsers };
    if (isTyping) {
      typingUsers[userId] = { username, lastSeen: Date.now() };
    } else {
      delete typingUsers[userId];
    }
    setState({ ...state, typingUsers });
  },

  pruneTyping(timeoutMs = 4000) {
    const state = getState();
    const now = Date.now();
    const typingUsers = Object.fromEntries(
      Object.entries(state.typingUsers).filter(([, meta]) => now - meta.lastSeen < timeoutMs)
    );
    if (Object.keys(typingUsers).length !== Object.keys(state.typingUsers).length) {
      setState({ ...state, typingUsers });
    }
  },

  reset() {
    setState(initialState);
  },
};
