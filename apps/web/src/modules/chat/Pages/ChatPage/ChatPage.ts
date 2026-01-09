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
import { navigate } from '@/routes';

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
  private scrollSchedule?: number;
  private lastTypingReceived: Map<string, number> = new Map();
  private shownNotifications: Set<string> = new Set(); // Track shown notifications to prevent duplicates
  private isSendingInvite = false; // Track invite send state to prevent duplicates

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
    const friendIdFromQuery = this.getFriendIdFromQuery();

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

    // Load conversations (and deep-link selection if needed)
    await this.loadConversations(friendIdFromQuery);

    // Setup typing indicator cleanup interval
    const typingCleanupInterval = setInterval(() => {
      chatStateHelpers.clearStaleTypingIndicators();
    }, 1000);

    this.unsubscribers.push(() => clearInterval(typingCleanupInterval));

    this.attachEventListeners();
  }

  protected attachEventListeners(): void {
    if (!this.element) return;

    const profileLinks = this.element.querySelectorAll<HTMLElement>('[data-profile-id]');
    profileLinks.forEach((link) => {
      const handler = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        const profileId = link.dataset.profileId;
        if (profileId) {
          navigate(`/profile/${profileId}`);
        }
      };
      link.addEventListener('click', handler);
      this.subscriptions.push(() => {
        link.removeEventListener('click', handler);
      });
    });
  }

  onUnmount(): void {
    console.log('[ChatPage] Unmounting');

    // Unsubscribe from all subscriptions
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    // Clear typing timeouts
    this.typingTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.typingTimeouts.clear();
    this.lastTypingReceived.clear();
    this.shownNotifications.clear();

    if (this.scrollSchedule) {
      cancelAnimationFrame(this.scrollSchedule);
      this.scrollSchedule = undefined;
    }

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
          // Mark as own if sent by current user and attach avatar
          const isOwn = message.senderId === this.state.currentUserId;
          
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
            const recipientAvatar = !isOwn ? (message as any).senderAvatar : undefined;
            
            // Create a new conversation object
            const newConversation: Conversation = {
              conversationId: message.conversationId,
              recipientId: recipientId || '',
              recipientUsername: recipientUsername || 'Unknown',
              type: (message as any).type || 'DIRECT',
              lastMessage: this.withDisplayMeta(message, conversation || undefined),
              unreadCount: 0,
              isOnline: false,
              recipientAvatar,
            };
            
            console.log('[ChatPage] Created new conversation:', newConversation);
            chatStateHelpers.upsertConversation(newConversation);
            conversation = newConversation;
          }
          
          const messageWithMeta = this.withDisplayMeta(message, conversation);
          
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
          
          chatStateHelpers.addMessage(message.conversationId, messageWithMeta);
          console.log('[ChatPage] Message added to state');
          console.log('[ChatPage] Global state messages:', chatState.get().messages[message.conversationId]?.length || 0);

          // Update conversation in list with last message
          if (conversation) {
            chatStateHelpers.upsertConversation({
              ...conversation,
              recipientAvatar: conversation.recipientAvatar || (!isOwn ? (messageWithMeta as any).senderAvatar : undefined),
              lastMessage: messageWithMeta,
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
        const now = Date.now();
        const last = this.lastTypingReceived.get(data.userId) || 0;
        // Ignore rapid duplicates (socket reconnections or multiple transports)
        if (now - last < 250) {
          return;
        }
        this.lastTypingReceived.set(data.userId, now);

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

    // Listen for message send errors (e.g., blocked or not friends)
    this.unsubscribers.push(
      chatWebSocketService.onMessageError((data: { error?: string }) => {
        const message = data?.error || 'Failed to send message';
        console.warn('[ChatPage] Message error:', message);
        chatStateHelpers.setError(message);
      })
    );

    // Listen for invite accepted
    this.unsubscribers.push(
      chatWebSocketService.onInviteAccepted((data: { inviteId: string; gameId: string; acceptedBy: string; acceptedByUsername: string }) => {
        console.log('[ChatPage] ========================================');
        console.log('[ChatPage] ✅ INVITE ACCEPTED EVENT RECEIVED!');
        console.log('[ChatPage] Data:', JSON.stringify(data, null, 2));
        console.log('[ChatPage] Current userId:', this.state.currentUserId);
        console.log('[ChatPage] Acceptor userId:', data.acceptedBy);
        console.log('[ChatPage] Acceptor username:', data.acceptedByUsername);
        console.log('[ChatPage] Game ID:', data.gameId);
        console.log('[ChatPage] ========================================');
        
        // Prevent duplicate notifications
        const notificationKey = `accepted:${data.inviteId}`;
        if (this.shownNotifications.has(notificationKey)) {
          console.log('[ChatPage] Skipping duplicate notification for invite:', data.inviteId);
          return;
        }
        this.shownNotifications.add(notificationKey);
        
        // Show success notification
        this.showInviteNotification(
          'success',
          `<strong>${data.acceptedByUsername}</strong> accepted your game invite!`,
          data.gameId
        );

        // Immediately send inviter to the game lobby (only if not already there)
        const targetPath = `/game/lobby/${data.gameId}`;
        if (!window.location.pathname.startsWith('/game/lobby/')) {
          navigate(targetPath);
        }
      })
    );

    // Listen for invite declined
    this.unsubscribers.push(
      chatWebSocketService.onInviteDeclined((data: { inviteId: string; declinedBy: string; declinedByUsername: string }) => {
        console.log('[ChatPage] ========================================');
        console.log('[ChatPage] ❌ INVITE DECLINED EVENT RECEIVED!');
        console.log('[ChatPage] Data:', JSON.stringify(data, null, 2));
        console.log('[ChatPage] Current userId:', this.state.currentUserId);
        console.log('[ChatPage] Decliner userId:', data.declinedBy);
        console.log('[ChatPage] Decliner username:', data.declinedByUsername);
        console.log('[ChatPage] ========================================');
        
        // Prevent duplicate notifications
        const notificationKey = `declined:${data.inviteId}`;
        if (this.shownNotifications.has(notificationKey)) {
          console.log('[ChatPage] Skipping duplicate notification for invite:', data.inviteId);
          return;
        }
        this.shownNotifications.add(notificationKey);
        
        // Show info notification
        this.showInviteNotification(
          'info',
          `<strong>${data.declinedByUsername}</strong> declined your game invite.`
        );
      })
    );

    // Listen for invite accept success (when YOU accept an invite)
    this.unsubscribers.push(
      chatWebSocketService.onInviteAcceptedSuccess((data: { success: boolean; gameId: string }) => {
        console.log('[ChatPage] Invite accept success:', data);

        // Show success notification to the accepter
        this.showInviteNotification(
          'success',
          'You accepted the game invite!',
          data.gameId
        );

        // Immediately send acceptor to the game lobby (only if not already there)
        const targetPath = `/game/lobby/${data.gameId}`;
        if (!window.location.pathname.startsWith('/game/lobby/')) {
          navigate(targetPath);
        }
      })
    );

    // Listen for invite errors
    this.unsubscribers.push(
      chatWebSocketService.onInviteError((data: { error: string }) => {
        console.error('[ChatPage] Invite error:', data.error);

        // Show error
        chatStateHelpers.setError(data.error);
      })
    );
  }

  private getFriendIdFromQuery(): string | undefined {
    try {
      const params = new URL(window.location.href).searchParams;
      return params.get('friendId') ?? params.get('user') ?? undefined;
    } catch (_error) {
      return undefined;
    }
  }

  private scrollMessagesToBottom(): void {
    if (this.scrollSchedule) {
      cancelAnimationFrame(this.scrollSchedule);
    }

    this.scrollSchedule = requestAnimationFrame(() => {
      const root = this.element;
      if (!root) return;

      const scrollers: HTMLElement[] = [];
      const inner = root.querySelector('.message-list__messages') as HTMLElement | null;
      const outer = root.querySelector('.message-list-container') as HTMLElement | null;
      if (inner) scrollers.push(inner);
      if (outer) scrollers.push(outer);

      scrollers.forEach((el) => {
        const distanceFromBottom = el.scrollHeight - el.clientHeight - el.scrollTop;
        const shouldStickToBottom = distanceFromBottom < 120 || el.scrollTop === 0;
        if (shouldStickToBottom) {
          el.scrollTop = el.scrollHeight;
        }
      });
    });
  }

  private resolveAvatarForMessage(message: ChatMessage, conversation?: Conversation): string {
    const authUser = appState.auth.get().user;
    if (message.senderId === authUser?.id) {
      return authUser.avatar || '/assets/images/ape.png';
    }

    if (conversation?.type === 'DIRECT') {
      return conversation.recipientAvatar || (message as any).senderAvatar || '/assets/images/ape.png';
    }

    return (message as any).senderAvatar || conversation?.recipientAvatar || '/assets/images/ape.png';
  }

  private withDisplayMeta(message: ChatMessage, conversation?: Conversation): ChatMessage {
    const avatar = this.resolveAvatarForMessage(message, conversation);
    return {
      ...message,
      senderAvatar: avatar,
      isOwn: message.senderId === this.state.currentUserId,
    };
  }

  private normalizeConversations(raw: any[]): Conversation[] {
    const currentUserId = this.state.currentUserId;
    const unique = new Map<string, Conversation>();

    raw.forEach((conv) => {
      const otherUserId =
        conv.otherUserId ||
        (Array.isArray(conv.participants)
          ? conv.participants.find((id: string) => id !== currentUserId)
          : conv.recipientId);
      if (!otherUserId) {
        return;
      }

      const key = conv.type === 'GAME' && conv.gameId ? `G-${conv.gameId}` : `D-${otherUserId}`;

      // Normalize lastMessage timestamps
      const lastMessage = conv.lastMessage
        ? {
            ...conv.lastMessage,
            timestamp:
              conv.lastMessage.createdAt ||
              conv.lastMessage.timestamp ||
              conv.lastMessage.sentAt,
          }
        : undefined;
      const avatarFromLast =
        lastMessage && lastMessage.senderId !== currentUserId
          ? (lastMessage as any).senderAvatar
          : undefined;

      unique.set(key, {
        conversationId: conv.conversationId || conv.id,
        type: conv.type || 'DIRECT',
        recipientId: conv.type === 'DIRECT' ? otherUserId : undefined,
        recipientUsername: conv.otherUsername || conv.recipientUsername || conv.lastMessage?.senderUsername || 'Friend',
        recipientHandle: conv.recipientUsername || conv.otherUsername || conv.lastMessage?.senderUsername,
        recipientAvatar: conv.recipientAvatar || (conv as any).otherAvatar || avatarFromLast,
        gameId: conv.gameId,
        isOnline: conv.isOnline ?? false,
        lastMessage,
        unreadCount: conv.unreadCount ?? 0,
      });
    });

    return Array.from(unique.values());
  }

  private async enrichDirectRecipients(conversations: Conversation[]): Promise<Conversation[]> {
    const missingIds = new Set<string>();
    conversations.forEach((c) => {
      if (c.type === 'DIRECT' && c.recipientId && (!c.recipientUsername || !c.recipientAvatar)) {
        missingIds.add(c.recipientId);
      }
    });

    if (missingIds.size === 0) {
      return conversations;
    }

    const profiles = await Promise.all(
      Array.from(missingIds).map(async (id) => {
        try {
          const info = await userService.getUserInfo(id);
          return { id, info };
        } catch (error) {
          console.warn('[ChatPage] Failed to fetch user info for chat participant', id, error);
          return { id, info: null };
        }
      })
    );

    const profileMap = new Map<string, any>();
    profiles.forEach(({ id, info }) => {
      if (info) profileMap.set(id, info);
    });

    return conversations.map((c) => {
      if (c.type !== 'DIRECT' || !c.recipientId) return c;
      const info = profileMap.get(c.recipientId);
      if (!info) return c;
      return {
        ...c,
        recipientUsername: info.displayName || info.username || c.recipientUsername,
        recipientHandle: info.username || c.recipientHandle,
        recipientAvatar: info.avatar || c.recipientAvatar,
      };
    });
  }

  private async loadConversations(friendIdToSelect?: string): Promise<void> {
    chatStateHelpers.setLoadingConversations(true);
    chatStateHelpers.clearError();

    try {
      const conversations = await chatService.getConversations();
      console.log('[ChatPage] Loaded conversations:', conversations);
      const normalized = await this.enrichDirectRecipients(this.normalizeConversations(conversations));
      chatStateHelpers.setConversations(normalized);

      // Auto-select first conversation if none selected
      if (friendIdToSelect) {
        await this.selectConversationByRecipient(friendIdToSelect);
      } else if (!this.state.selectedConversationId && normalized.length > 0) {
        await this.selectConversation(normalized[0].conversationId);
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
        ...this.withDisplayMeta(msg, conversation),
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
      let recipientAvatar: string | undefined;
      try {
        const userInfo = await userService.getUserInfo(recipientId);
        recipientName = userInfo.displayName || userInfo.username || 'Friend';
        recipientAvatar = userInfo.avatar;
        console.log('[ChatPage] Fetched recipient name:', recipientName);
      } catch (error) {
        console.warn('[ChatPage] Failed to fetch recipient info:', error);
      }
      
      // Store recipient ID for new conversation (placeholder in list)
      const draftConversation: Conversation = {
        conversationId: `draft-${recipientId}`,
        type: 'DIRECT',
        recipientId,
        recipientUsername: recipientName,
        recipientAvatar: recipientAvatar,
        unreadCount: 0,
      };

      chatStateHelpers.upsertConversation(draftConversation);
      this.setState({ 
        newChatRecipientId: recipientId,
        selectedConversationId: draftConversation.conversationId,
        messages: [],
        newChatRecipientName: recipientName
      });

      chatStateHelpers.setActiveConversation(draftConversation.conversationId);
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

  private showInviteNotification(type: 'success' | 'info', message: string, gameId?: string): void {
    console.log(`[ChatPage] Creating ${type} notification:`, message);
    
    const notification = document.createElement('div');
    notification.className = `chat-notification chat-notification--${type}`;
    
    // Build notification content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'chat-notification__body';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-notification__message';
    messageDiv.innerHTML = message;
    contentDiv.appendChild(messageDiv);
    
    if (gameId) {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'chat-notification__action';
      actionBtn.textContent = 'Join Game';
      actionBtn.onclick = () => {
        if (!window.location.pathname.startsWith('/game/lobby/')) {
          navigate(`/game/lobby/${gameId}`);
        }
      };
      contentDiv.appendChild(actionBtn);
    }
    
    notification.appendChild(contentDiv);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'chat-notification__close';
    closeBtn.innerHTML = '✕';
    closeBtn.onclick = () => {
      notification.classList.remove('chat-notification--show');
      setTimeout(() => notification.remove(), 300);
    };
    notification.appendChild(closeBtn);
    
    document.body.appendChild(notification);
    console.log('[ChatPage] Notification appended to body');
    
    // Show with delay for animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        notification.classList.add('chat-notification--show');
        console.log('[ChatPage] Notification shown');
      });
    });
    
    // Auto-hide after duration
    const duration = type === 'success' ? 8000 : 5000;
    const hideTimeout = setTimeout(() => {
      notification.classList.remove('chat-notification--show');
      setTimeout(() => notification.remove(), 300);
      console.log('[ChatPage] Notification removed');
    }, duration);
    
    // Clear timeout on manual close
    closeBtn.addEventListener('click', () => clearTimeout(hideTimeout), { once: true });
  }

  private async handleInvite(): Promise<void> {
    if (this.isSendingInvite) {
      console.log('[ChatPage] Already sending invite, ignoring duplicate click');
      return;
    }

    const recipientId = this.state.newChatRecipientId
      ? this.state.newChatRecipientId
      : this.state.conversations.find((c) => c.conversationId === this.state.selectedConversationId)?.recipientId;

    if (!recipientId) {
      console.warn('[ChatPage] Cannot send invite: no recipient');
      return;
    }

    this.isSendingInvite = true;
    console.log('[ChatPage] Sending invite to:', recipientId);

    // Backend expects uppercase enum values (CLASSIC | TOURNAMENT)
    const invitePayload = { mode: 'CLASSIC' } as Record<string, unknown>;

    try {
      if (this.state.isConnected) {
        console.log('[ChatPage] Sending invite via WebSocket');
        chatWebSocketService.sendInvite(recipientId, invitePayload);
      } else {
        console.log('[ChatPage] WebSocket unavailable, sending invite via HTTP');
        await chatService.sendMessage({
          type: 'INVITE',
          content: 'Game invite',
          recipientId,
          invitePayload,
        });
      }
    } catch (error) {
      console.error('[ChatPage] Failed to send invite', error);
    } finally {
      // Reset the flag after a delay to avoid duplicate invites on slow responses
      setTimeout(() => {
        this.isSendingInvite = false;
      }, 2000);
    }
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

  private handleAcceptInvite(inviteId: string, retryCount = 0): void {
    const maxRetries = 2;
    console.log('[ChatPage] Accepting invite:', inviteId, 'retry:', retryCount);
    
    // Always use HTTP accept so backend handles game creation and emits events
    chatService.acceptInvite(inviteId)
      .then((response) => {
        // Check if response contains an error (backend handled gracefully)
        if ((response as any).error) {
          throw new Error((response as any).error);
        }
        
        console.log('[ChatPage] Invite accepted via HTTP:', response);
        
        // Verify we got a valid game ID
        if (!response.gameId) {
          throw new Error('Game ID missing from response');
        }
        
        this.showInviteNotification(
          'success',
          'You accepted the game invite!',
          response.gameId
        );

        // Ensure the accepter is redirected even if the WS event is missed (only if not already there)
        const targetPath = `/game/lobby/${response.gameId}`;
        if (!window.location.pathname.startsWith('/game/lobby/')) {
          navigate(targetPath);
        }
      })
      .catch((error) => {
        console.error('[ChatPage] Failed to accept invite:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Determine if we should retry
        const shouldRetry = retryCount < maxRetries && 
                           (errorMessage.includes('timeout') || 
                            errorMessage.includes('network') ||
                            errorMessage.includes('unavailable'));
        
        if (shouldRetry) {
          // Exponential backoff: 1s, 2s
          const backoffMs = 1000 * Math.pow(2, retryCount);
          chatStateHelpers.setError(`Connection issue. Retrying in ${backoffMs / 1000}s...`);
          
          setTimeout(() => {
            chatStateHelpers.setError('');
            this.handleAcceptInvite(inviteId, retryCount + 1);
          }, backoffMs);
        } else {
          // All retries exhausted or non-retryable error
          let userMessage = 'Failed to accept invite. ';
          if (errorMessage.includes('timeout')) {
            userMessage += 'The server took too long to respond. Please try sending a new invite.';
          } else if (errorMessage.includes('already been responded')) {
            userMessage += 'This invite has already been accepted or declined.';
          } else if (errorMessage.includes('network') || errorMessage.includes('unavailable')) {
            userMessage += 'Please check your connection and try again.';
          } else {
            userMessage += errorMessage;
          }
          
          chatStateHelpers.setError(userMessage);
        }
      });
  }

  private handleDeclineInvite(inviteId: string): void {
    console.log('[ChatPage] Declining invite:', inviteId);
    
    if (this.state.isConnected) {
      chatWebSocketService.declineInvite(inviteId);
    } else {
      // Fallback to HTTP if WebSocket not connected
      console.log('[ChatPage] WebSocket not connected, using HTTP to decline invite');
      chatService.declineInvite(inviteId)
        .then((response) => {
          console.log('[ChatPage] Invite declined via HTTP:', response);
          alert('Invite declined.');
        })
        .catch((error) => {
          console.error('[ChatPage] Failed to decline invite:', error);
          alert('Failed to decline invite. Please try again.');
        });
    }
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
        const handle = (selectedConv as any)?.recipientHandle || (selectedConv as any)?.otherUserId;
        username = handle ? `@${handle}` : '';
        avatarUrl = selectedConv?.recipientAvatar || '/assets/images/ape.png';
        if (selectedConv?.type === 'DIRECT' && selectedConv?.isOnline) {
          onlineStatus = '<span class="chat-page__online-badge"></span>';
        }
      }

      const profileId =
        selectedConv?.type === 'DIRECT' ? selectedConv?.recipientId : undefined;
      const headerContent = profileId
        ? `
        <button class="chat-page__header-profile" type="button" data-profile-id="${profileId}">
          <img src="${avatarUrl}" alt="${displayName}" class="chat-page__header-avatar" />
          <div class="chat-page__header-info">
            <h2>${displayName}</h2>
            <p class="chat-page__header-username">${username}</p>
          </div>
        </button>
      `
        : `
        <div class="chat-page__header-content">
          <img src="${avatarUrl}" alt="${displayName}" class="chat-page__header-avatar" />
          <div class="chat-page__header-info">
            <h2>${displayName}</h2>
            <p class="chat-page__header-username">${username}</p>
          </div>
        </div>
      `;

      header.innerHTML = `
        ${headerContent}
        ${onlineStatus}
      `;
      messagesPanel.appendChild(header);

      // Messages
      const messageList = new MessageList({
        messages,
        currentUserId,
        typingUsername,
        isLoading: isLoadingMessages,
        hasMore: false, // TODO: Implement pagination
        onAcceptInvite: (messageId) => this.handleAcceptInvite(messageId),
        onDeclineInvite: (messageId) => this.handleDeclineInvite(messageId),
      });

      const messageListContainer = document.createElement('div');
      messageListContainer.className = 'message-list-container';
      messageList.mount(messageListContainer);
      messagesPanel.appendChild(messageListContainer);

      // Input
      const messageInput = new MessageInput({
        onSend: (content) => this.handleSendMessage(content),
        onTyping: () => this.handleTyping(),
        onInvite: () => this.handleInvite(),
        disabled: !isConnected,
        placeholder: isConnected ? 'Type a message...' : 'Connecting...',
      });

      // Properly mount the component so event listeners work
      const inputContainer = document.createElement('div');
      messageInput.mount(inputContainer);
      messagesPanel.appendChild(inputContainer);

      // Keep the viewport pinned to the latest messages when appropriate
      this.scrollMessagesToBottom();
    }

    chatContainer.appendChild(messagesPanel);
    container.appendChild(chatContainer);

    return container;
  }
}
