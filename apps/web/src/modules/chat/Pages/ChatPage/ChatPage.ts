import Component from '@/core/Component';
import type { ChatMessage, Conversation } from '@/models/Chat';
import type { ChatState } from '@/state/chat.state';
import { chatService } from '@/services/api/ChatService';
import { chatWebSocketService } from '@/services/api/ChatWebSocketService';
import { chatState, chatStateHelpers } from '@/state/chat.state';
import { appState } from '@/state';
import { userService } from '@/services/api/UserService';
import ConversationList from '../../components/ConversationList';
import MessageList from '../../components/MessageList';
import MessageInput from '../../components/MessageInput';

type State = {
  conversations: Conversation[];
  selectedConversationId?: string;
  messages: ChatMessage[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  isConnected: boolean;
  typingUsername?: string;
  error?: string;
  currentUserId: string;
  newChatRecipientId?: string; // For starting new conversations
  newChatRecipientName?: string; // Display name for new chat
};

export default class ChatPage extends Component<Record<string, never>, State> {
  private unsubscribers: Array<() => void> = [];
  private typingTimeouts: Map<string, number> = new Map();

  constructor(props: Record<string, never> = {}) {
    super(props);
  }

  getInitialState(): State {
    const authData = appState.auth.get();
    return {
      conversations: [],
      messages: [],
      selectedConversationId: undefined,
      isLoadingConversations: true,
      isLoadingMessages: false,
      isSending: false,
      isConnected: false,
      typingUsername: undefined,
      error: undefined,
      currentUserId: authData.user?.id || '',
      newChatRecipientId: undefined,
      newChatRecipientName: undefined,
    };
  }

  async onMount(): Promise<void> {
    console.log('[ChatPage] Mounting');

    // Subscribe to chat state changes
    this.unsubscribers.push(
      chatState.subscribe((state: ChatState) => {
        console.log('[ChatPage] State subscription triggered - activeConversationId:', state.activeConversationId);
        
        // Update messages for active conversation
        const messages = state.activeConversationId 
          ? (state.messages[state.activeConversationId] || [])
          : [];
        
        console.log('[ChatPage] State update - active conversation:', state.activeConversationId, 'messages:', messages.length);
        
        this.setState({
          conversations: state.conversations,
          selectedConversationId: state.activeConversationId,
          isLoadingConversations: state.isLoadingConversations,
          isLoadingMessages: state.isLoadingMessages,
          isConnected: state.isConnected,
          error: state.error,
          messages,
        });

        // Get typing indicator for active conversation
        const activeConv = state.conversations.find(
          (c: Conversation) => c.conversationId === state.activeConversationId
        );
        if (activeConv?.recipientId) {
          const typing = state.typingUsers[activeConv.recipientId];
          this.setState({ typingUsername: typing?.username });
        }
      })
    );

    // Connect to WebSocket
    const token = localStorage.getItem('token');
    if (token) {
      console.log('[ChatPage] Connecting to chat WebSocket');
      
      // Connect first
      chatWebSocketService.connect(token);
      
      // Setup WebSocket event handlers after socket is created
      this.setupWebSocketHandlers();
    } else {
      console.error('[ChatPage] No auth token found');
      chatStateHelpers.setError('Authentication required');
    }

    // Load conversations
    await this.loadConversations();

    // Check for friendId query parameter for deep linking
    const friendId = this.getFriendIdFromQuery();
    if (friendId) {
      // Wait a bit for conversations to be set in state
      setTimeout(() => {
        this.selectConversationByRecipient(friendId);
      }, 100);
    }

    // Setup typing indicator cleanup interval
    const typingCleanupInterval = setInterval(() => {
      chatStateHelpers.clearStaleTypingIndicators();
    }, 1000);

    this.unsubscribers.push(() => clearInterval(typingCleanupInterval));

    this.attachEventListeners();
  }

  protected attachEventListeners(): void {
    // Event listeners are handled by child components
    // This method is required by Component base class
  }

  onUnmount(): void {
    console.log('[ChatPage] Unmounting');

    // Unsubscribe from all subscriptions
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    // Clear typing timeouts
    this.typingTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.typingTimeouts.clear();

    // Disconnect WebSocket
    chatWebSocketService.disconnect();
    chatStateHelpers.setConnected(false);
  }

  private setupWebSocketHandlers(): void {
    // Listen for connection events
    this.unsubscribers.push(
      chatWebSocketService.onConnect(() => {
        console.log('[ChatPage] WebSocket connected');
        chatStateHelpers.setConnected(true);
        chatStateHelpers.clearError();
      })
    );

    this.unsubscribers.push(
      chatWebSocketService.onDisconnect((reason) => {
        console.log('[ChatPage] WebSocket disconnected:', reason);
        chatStateHelpers.setConnected(false);
        if (reason !== 'User initiated disconnect') {
          chatStateHelpers.setError('Connection lost. Reconnecting...');
        }
      })
    );

    // Listen for new messages
    this.unsubscribers.push(
      chatWebSocketService.onMessage((message: ChatMessage) => {
        console.log('[ChatPage] Received message:', message);
        console.log('[ChatPage] Current userId:', this.state.currentUserId);
        console.log('[ChatPage] Selected conversation (local):', this.state.selectedConversationId);
        console.log('[ChatPage] Active conversation (global):', chatState.get().activeConversationId);
        console.log('[ChatPage] newChatRecipientId:', this.state.newChatRecipientId);

        if (message.conversationId) {
          // Mark as own if sent by current user
          const isOwn = message.senderId === this.state.currentUserId;
          const messageWithOwn = { ...message, isOwn } as ChatMessage;
          console.log('[ChatPage] Adding message to conversation:', message.conversationId, 'isOwn:', isOwn);
          
          // Check if this is a new conversation (not in our list yet)
          let conversation = this.state.conversations.find(
            (c) => c.conversationId === message.conversationId
          );
          
          // If conversation doesn't exist, create it (happens when starting a new chat)
          if (!conversation) {
            console.log('[ChatPage] New conversation detected, creating:', message.conversationId);
            
            // Determine the other participant
            const recipientId = isOwn ? (message as any).recipientId : message.senderId;
            // Use the stored newChatRecipientName if this is the sender's own message in a new chat
            const recipientUsername = isOwn 
              ? (this.state.newChatRecipientName || 'Friend') 
              : message.senderUsername;
            
            // Create a new conversation object
            const newConversation: Conversation = {
              conversationId: message.conversationId,
              recipientId: recipientId || '',
              recipientUsername: recipientUsername || 'Unknown',
              type: (message as any).type || 'DIRECT',
              lastMessage: message,
              unreadCount: 0,
              isOnline: false,
            };
            
            console.log('[ChatPage] Created new conversation:', newConversation);
            chatStateHelpers.upsertConversation(newConversation);
            conversation = newConversation;
          }
          
          // If we were starting a new chat and this is our own message, set this as active conversation
          if (this.state.newChatRecipientId && isOwn) {
            console.log('[ChatPage] Setting new conversation as active:', message.conversationId);
            chatStateHelpers.setActiveConversation(message.conversationId);
            // Clear the new chat state
            this.setState({ 
              newChatRecipientId: undefined,
              newChatRecipientName: undefined,
            });
          }
          
          chatStateHelpers.addMessage(message.conversationId, messageWithOwn);
          console.log('[ChatPage] Message added to state');
          console.log('[ChatPage] Global state messages:', chatState.get().messages[message.conversationId]?.length || 0);

          // Update conversation in list with last message
          if (conversation) {
            chatStateHelpers.upsertConversation({
              ...conversation,
              lastMessage: message,
              unreadCount:
                this.state.selectedConversationId !== message.conversationId && !isOwn
                  ? (conversation.unreadCount || 0) + 1
                  : conversation.unreadCount || 0,
            });
          }
        }
      })
    );

    // Listen for typing indicators
    this.unsubscribers.push(
      chatWebSocketService.onTyping((data: { userId: string; username: string }) => {
        console.log('[ChatPage] User typing:', data);
        chatStateHelpers.setTyping(data.userId, data.username, true);

        // Clear typing indicator after 3 seconds
        const existingTimeout = this.typingTimeouts.get(data.userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        const timeout = window.setTimeout(() => {
          chatStateHelpers.setTyping(data.userId, data.username, false);
          this.typingTimeouts.delete(data.userId);
        }, 3000);

        this.typingTimeouts.set(data.userId, timeout);
      })
    );

    // Listen for user online/offline
    this.unsubscribers.push(
      chatWebSocketService.onUserOnline((data: { userId: string }) => {
        console.log('[ChatPage] User online:', data);
        chatStateHelpers.updateUserOnlineStatus(data.userId, true);
      })
    );

    this.unsubscribers.push(
      chatWebSocketService.onUserOffline((data: { userId: string }) => {
        console.log('[ChatPage] User offline:', data);
        chatStateHelpers.updateUserOnlineStatus(data.userId, false);
      })
    );

    // Listen for errors
    this.unsubscribers.push(
      chatWebSocketService.onError((error: { message: string }) => {
        console.error('[ChatPage] WebSocket error:', error);
        chatStateHelpers.setError(error.message);
      })
    );
  }

  private getFriendIdFromQuery(): string | undefined {
    try {
      const params = new URL(window.location.href).searchParams;
      return params.get('friendId') ?? undefined;
    } catch (_error) {
      return undefined;
    }
  }

  private async loadConversations(): Promise<void> {
    chatStateHelpers.setLoadingConversations(true);
    chatStateHelpers.clearError();

    try {
      const conversations = await chatService.getConversations();
      console.log('[ChatPage] Loaded conversations:', conversations);
      chatStateHelpers.setConversations(conversations);

      // Auto-select first conversation if none selected
      if (!this.state.selectedConversationId && conversations.length > 0) {
        await this.selectConversation(conversations[0].conversationId);
      }
    } catch (error) {
      console.error('[ChatPage] Failed to load conversations:', error);
      const message = error instanceof Error ? error.message : 'Failed to load conversations';
      chatStateHelpers.setError(message);
    }
  }

  private async selectConversation(conversationId: string): Promise<void> {
    console.log('[ChatPage] Selecting conversation:', conversationId);
    
    chatStateHelpers.setActiveConversation(conversationId);
    chatStateHelpers.setLoadingMessages(true);

    const conversation = this.state.conversations.find((c) => c.conversationId === conversationId);
    if (!conversation) {
      console.error('[ChatPage] Conversation not found:', conversationId);
      return;
    }

    try {
      // Load messages for this conversation
      const response = await chatService.getMessages({
        type: conversation.type,
        recipientId: conversation.recipientId,
        gameId: conversation.gameId,
        limit: 50,
      });

      console.log('[ChatPage] Loaded messages:', response);

      // Mark messages as own/other
      const messages = response.messages.map((msg: ChatMessage) => ({
        ...msg,
        isOwn: msg.senderId === this.state.currentUserId,
      }));

      chatStateHelpers.setMessages(conversationId, messages);
      chatStateHelpers.markConversationAsRead(conversationId);

      // Join game chat if needed
      if (conversation.type === 'GAME' && conversation.gameId) {
        chatWebSocketService.joinGameChat(conversation.gameId);
      }
    } catch (error) {
      console.error('[ChatPage] Failed to load messages:', error);
      const message = error instanceof Error ? error.message : 'Failed to load messages';
      chatStateHelpers.setError(message);
      chatStateHelpers.setLoadingMessages(false);
    }
  }

  private async selectConversationByRecipient(recipientId: string): Promise<void> {
    console.log('[ChatPage] Looking for conversation with recipient:', recipientId);
    console.log('[ChatPage] Available conversations:', this.state.conversations);
    
    // Find conversation by recipient ID
    const conversation = this.state.conversations.find((c) => c.recipientId === recipientId);

    if (conversation) {
      console.log('[ChatPage] Found conversation:', conversation.conversationId);
      await this.selectConversation(conversation.conversationId);
    } else {
      // No existing conversation - prepare to create one
      console.log('[ChatPage] No conversation found, preparing new chat with:', recipientId);
      
      // Fetch recipient info to get their username
      let recipientName = 'Friend';
      try {
        const userInfo = await userService.getUserInfo(recipientId);
        recipientName = userInfo.displayName || userInfo.username || 'Friend';
        console.log('[ChatPage] Fetched recipient name:', recipientName);
      } catch (error) {
        console.warn('[ChatPage] Failed to fetch recipient info:', error);
      }
      
      // Store recipient ID for new conversation
      this.setState({ 
        newChatRecipientId: recipientId,
        selectedConversationId: undefined,
        messages: [],
        newChatRecipientName: recipientName
      });
      
      chatStateHelpers.setError(undefined);
    }
  }

  private handleSendMessage(content: string): void {
    if (!this.state.isConnected) {
      console.warn('[ChatPage] Cannot send message: not connected');
      return;
    }

    // Handle new conversation (no existing conversation selected)
    if (!this.state.selectedConversationId && this.state.newChatRecipientId) {
      console.log('[ChatPage] Sending first message to create new conversation with:', this.state.newChatRecipientId);
      
      // Send via WebSocket - backend will create the conversation
      chatWebSocketService.sendMessage(content, this.state.newChatRecipientId, undefined);
      
      // Clear the new chat state - conversation will be created on server
      // and we'll receive it via WebSocket
      return;
    }

    if (!this.state.selectedConversationId) {
      console.warn('[ChatPage] Cannot send message: no conversation selected');
      return;
    }

    const conversation = this.state.conversations.find(
      (c) => c.conversationId === this.state.selectedConversationId
    );

    if (!conversation) {
      console.error('[ChatPage] Selected conversation not found');
      return;
    }

    console.log('[ChatPage] Sending message:', content);

    // Send via WebSocket
    chatWebSocketService.sendMessage(content, conversation.recipientId, conversation.gameId);

    // Optimistic UI update (message will be confirmed via WebSocket event)
    // We don't add it here to avoid duplicates - wait for server confirmation
  }

  private handleTyping(): void {
    if (!this.state.selectedConversationId || !this.state.isConnected) {
      return;
    }

    const conversation = this.state.conversations.find(
      (c) => c.conversationId === this.state.selectedConversationId
    );

    if (!conversation) {
      return;
    }

    chatWebSocketService.sendTyping(conversation.recipientId, conversation.gameId);
  }

  render(): string | HTMLElement {
    console.log('[ChatPage] Rendering with messages:', this.state.messages.length);
    const {
      conversations,
      selectedConversationId,
      messages,
      isLoadingConversations,
      isLoadingMessages,
      isConnected,
      typingUsername,
      error,
      currentUserId,
      newChatRecipientId,
      newChatRecipientName,
    } = this.state;

    const container = document.createElement('div');
    container.className = 'chat-page';

    // Error banner
    if (error) {
      const errorBanner = document.createElement('div');
      errorBanner.className = 'chat-page__error';
      errorBanner.innerHTML = `
        <span>${error}</span>
        <button class="chat-page__error-close" onclick="this.parentElement.remove()">✕</button>
      `;
      container.appendChild(errorBanner);
    }

    // Connection status indicator
    if (!isConnected) {
      const statusBanner = document.createElement('div');
      statusBanner.className = 'chat-page__status chat-page__status--disconnected';
      statusBanner.textContent = 'Disconnected - Reconnecting...';
      container.appendChild(statusBanner);
    }

    // Main chat container
    const chatContainer = document.createElement('div');
    chatContainer.className = 'chat-page__container glass-panel';

    // Left sidebar - Conversations
    const conversationList = new ConversationList({
      conversations,
      activeConversationId: selectedConversationId,
      onSelectConversation: (id) => this.selectConversation(id),
      isLoading: isLoadingConversations,
    });

    const conversationListRendered = conversationList.render();
    const conversationListElement = document.createElement('div');
    if (typeof conversationListRendered === 'string') {
      conversationListElement.innerHTML = conversationListRendered;
    } else {
      conversationListElement.appendChild(conversationListRendered);
    }
    conversationListElement.className = 'chat-page__sidebar';
    chatContainer.appendChild(conversationListElement);

    // Right panel - Messages
    const messagesPanel = document.createElement('div');
    messagesPanel.className = 'chat-page__main';

    // Check if we're starting a new conversation
    const isNewChat = !selectedConversationId && newChatRecipientId;

    if (!selectedConversationId && !isNewChat) {
      // Empty state - no conversation selected
      messagesPanel.innerHTML = `
        <div class="chat-page__empty">
          <svg width="80" height="80" fill="currentColor" opacity="0.2" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
          <h3>Select a conversation</h3>
          <p class="text-muted">Choose a conversation from the list to start chatting</p>
        </div>
      `;
    } else {
      const selectedConv = conversations.find((c) => c.conversationId === selectedConversationId);

      // Header
      const header = document.createElement('div');
      header.className = 'chat-page__header';
      
      let displayName: string;
      let username: string = '';
      let onlineStatus = '';
      let avatarUrl = '/assets/images/ape.png';
      
      if (isNewChat) {
        displayName = newChatRecipientName || 'New Chat';
        username = 'Start a conversation';
      } else if (selectedConv?.type === 'GAME') {
        displayName = `Game Chat`;
        username = 'Game conversation';
      } else {
        // Use recipientUsername or otherUsername depending on backend response format
        displayName = selectedConv?.recipientUsername || (selectedConv as any)?.otherUsername || 'Unknown';
        username = displayName ? `@${displayName}` : '';
        // Generate avatar from username since backend doesn't provide it
        const avatarSeed = selectedConv?.recipientId || (selectedConv as any)?.otherUserId || 'default';
        avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${avatarSeed}`;
        if (selectedConv?.type === 'DIRECT' && selectedConv?.isOnline) {
          onlineStatus = '<span class="chat-page__online-badge"></span>';
        }
      }

      header.innerHTML = `
        <div class="chat-page__header-content">
          <img src="${avatarUrl}" alt="${displayName}" class="chat-page__header-avatar" />
          <div class="chat-page__header-info">
            <h2>${displayName}</h2>
            <p class="chat-page__header-username">${username}</p>
          </div>
          ${onlineStatus}
        </div>
      `;
      messagesPanel.appendChild(header);

      // Messages
      const messageList = new MessageList({
        messages,
        currentUserId,
        typingUsername,
        isLoading: isLoadingMessages,
        hasMore: false, // TODO: Implement pagination
      });

      const messageListContainer = document.createElement('div');
      messageListContainer.className = 'message-list-container';
      messageList.mount(messageListContainer);
      messagesPanel.appendChild(messageListContainer);

      // Input
      const messageInput = new MessageInput({
        onSend: (content) => this.handleSendMessage(content),
        onTyping: () => this.handleTyping(),
        disabled: !isConnected,
        placeholder: isConnected ? 'Type a message...' : 'Connecting...',
      });

      // Properly mount the component so event listeners work
      const inputContainer = document.createElement('div');
      messageInput.mount(inputContainer);
      messagesPanel.appendChild(inputContainer);
    }

    chatContainer.appendChild(messagesPanel);
    container.appendChild(chatContainer);

    return container;
  }
}