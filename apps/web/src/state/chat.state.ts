import Signal from '@/core/signal';
import type { ChatMessage, Conversation } from '@/models';

/**
 * Chat state interface
 */
export interface ChatState {
  // Conversations
  conversations: Conversation[];
  activeConversationId?: string;
  
  // Messages (keyed by conversationId)
  messages: Record<string, ChatMessage[]>;
  
  // Connection state
  isConnected: boolean;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  
  // Typing indicators (keyed by userId or gameId)
  typingUsers: Record<string, { username: string; timestamp: number }>;
  
  // Error state
  error?: string;
}

/**
 * Initial chat state
 */
const initialChatState: ChatState = {
  conversations: [],
  activeConversationId: undefined,
  messages: {},
  isConnected: false,
  isLoadingConversations: false,
  isLoadingMessages: false,
  typingUsers: {},
  error: undefined,
};

/**
 * Global chat state signal
 */
export const chatState = new Signal<ChatState>(initialChatState);

/**
 * Helper to get current chat state value
 */
const getChatState = (): ChatState => chatState.get();

/**
 * Helper to set chat state
 */
const setChatState = (newState: ChatState): void => chatState.set(newState);

/**
 * Helper functions for chat state updates
 */
export const chatStateHelpers = {
  /**
   * Set conversations
   */
  setConversations(conversations: Conversation[]) {
    const state = getChatState();
    setChatState({
      ...state,
      conversations,
      isLoadingConversations: false,
    });
  },

  /**
   * Add or update a conversation
   */
  upsertConversation(conversation: Conversation) {
    const state = getChatState();
    const existingIndex = state.conversations.findIndex(
      (c: Conversation) =>
        c.conversationId === conversation.conversationId ||
        (conversation.type === 'DIRECT' &&
          c.type === 'DIRECT' &&
          c.recipientId === conversation.recipientId) ||
        (conversation.type === 'GAME' &&
          c.type === 'GAME' &&
          c.gameId &&
          c.gameId === conversation.gameId)
    );

    const newConversations = [...state.conversations];
    
    if (existingIndex >= 0) {
      // Update existing
      newConversations[existingIndex] = conversation;
    } else {
      // Add new at the beginning
      newConversations.unshift(conversation);
    }

    setChatState({
      ...state,
      conversations: newConversations,
    });
  },

  /**
   * Set active conversation
   */
  setActiveConversation(conversationId?: string) {
    const state = getChatState();
    setChatState({
      ...state,
      activeConversationId: conversationId,
    });
  },

  /**
   * Set messages for a conversation
   */
  setMessages(conversationId: string, messages: ChatMessage[]) {
    const state = getChatState();
    const sorted = [...messages].sort((a, b) => {
      const aTime = new Date((a as any).createdAt || (a as any).timestamp || (a as any).sentAt).getTime();
      const bTime = new Date((b as any).createdAt || (b as any).timestamp || (b as any).sentAt).getTime();
      return aTime - bTime;
    });
    setChatState({
      ...state,
      messages: {
        ...state.messages,
        [conversationId]: sorted,
      },
      isLoadingMessages: false,
    });
  },

  /**
   * Add a new message to a conversation
   */
  addMessage(conversationId: string, message: ChatMessage) {
    const state = getChatState();
    const existingMessages = state.messages[conversationId] || [];
    
    // Avoid duplicates
    const isDuplicate = existingMessages.some((m: ChatMessage) => m.id === message.id);
    if (isDuplicate) {
      return;
    }

    const newMessages = [...existingMessages, message].sort((a, b) => {
      const aTime = new Date((a as any).createdAt || (a as any).timestamp || (a as any).sentAt).getTime();
      const bTime = new Date((b as any).createdAt || (b as any).timestamp || (b as any).sentAt).getTime();
      return aTime - bTime;
    });

    // Update conversation's lastMessage and unreadCount
    const updatedConversations = state.conversations.map((conv: Conversation) => {
      if (conv.conversationId === conversationId) {
        const isOwn = (message as any).isOwn;
        return {
          ...conv,
          lastMessage: message,
          // Increment unread if not active conversation and not own message
          unreadCount:
            state.activeConversationId !== conversationId && !isOwn
              ? conv.unreadCount + 1
              : conv.unreadCount,
        };
      }
      return conv;
    });

    setChatState({
      ...state,
      messages: {
        ...state.messages,
        [conversationId]: newMessages,
      },
      conversations: updatedConversations,
    });
  },

  /**
   * Prepend older messages (for pagination)
   */
  prependMessages(conversationId: string, messages: ChatMessage[]) {
    const state = getChatState();
    const existingMessages = state.messages[conversationId] || [];
    const combinedMessages = [...messages, ...existingMessages];
    
    // Remove duplicates by id
    const uniqueMessages = combinedMessages.filter(
      (msg, index, self) => self.findIndex((m) => m.id === msg.id) === index
    );

    setChatState({
      ...state,
      messages: {
        ...state.messages,
        [conversationId]: uniqueMessages,
      },
    });
  },

  /**
   * Mark conversation as read (reset unread count)
   */
  markConversationAsRead(conversationId: string) {
    const state = getChatState();
    const updatedConversations = state.conversations.map((conv: Conversation) => {
      if (conv.conversationId === conversationId) {
        return {
          ...conv,
          unreadCount: 0,
        };
      }
      return conv;
    });

    setChatState({
      ...state,
      conversations: updatedConversations,
    });
  },

  /**
   * Set typing indicator
   */
  setTyping(userId: string, username: string, isTyping: boolean) {
    const state = getChatState();
    const newTypingUsers = { ...state.typingUsers };
    
    if (isTyping) {
      newTypingUsers[userId] = { username, timestamp: Date.now() };
    } else {
      delete newTypingUsers[userId];
    }

    setChatState({
      ...state,
      typingUsers: newTypingUsers,
    });
  },

  /**
   * Clear stale typing indicators (older than 3 seconds)
   */
  clearStaleTypingIndicators() {
    const now = Date.now();
    const staleThreshold = 3000; // 3 seconds
    const state = getChatState();

    const newTypingUsers = { ...state.typingUsers };
    let hasChanges = false;

    for (const [userId, data] of Object.entries(newTypingUsers)) {
      const typingData = data as { username: string; timestamp: number };
      if (now - typingData.timestamp > staleThreshold) {
        delete newTypingUsers[userId];
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      return;
    }

    setChatState({
      ...state,
      typingUsers: newTypingUsers,
    });
  },

  /**
   * Update online status for a user
   */
  updateUserOnlineStatus(userId: string, isOnline: boolean) {
    const state = getChatState();
    const updatedConversations = state.conversations.map((conv: Conversation) => {
      if (conv.recipientId === userId) {
        return {
          ...conv,
          isOnline,
        };
      }
      return conv;
    });

    setChatState({
      ...state,
      conversations: updatedConversations,
    });
  },

  /**
   * Set connection state
   */
  setConnected(isConnected: boolean) {
    const state = getChatState();
    setChatState({
      ...state,
      isConnected,
    });
  },

  /**
   * Set loading states
   */
  setLoadingConversations(isLoading: boolean) {
    const state = getChatState();
    setChatState({
      ...state,
      isLoadingConversations: isLoading,
    });
  },

  setLoadingMessages(isLoading: boolean) {
    const state = getChatState();
    setChatState({
      ...state,
      isLoadingMessages: isLoading,
    });
  },

  /**
   * Set error
   */
  setError(error?: string) {
    const state = getChatState();
    setChatState({
      ...state,
      error,
    });
  },

  /**
   * Clear error
   */
  clearError() {
    const state = getChatState();
    setChatState({
      ...state,
      error: undefined,
    });
  },

  /**
   * Reset state (on logout/disconnect)
   */
  reset() {
    setChatState({ ...initialChatState });
  },
};
