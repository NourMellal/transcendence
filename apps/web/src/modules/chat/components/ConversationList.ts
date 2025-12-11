import Component from '@/core/Component';
import type { Conversation } from '@/models';
import ConversationItem from './ConversationItem';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  isLoading: boolean;
}

interface ConversationListState {
  searchQuery: string;
}

/**
 * ConversationList Component
 * Displays list of conversations with search
 */
export default class ConversationList extends Component<ConversationListProps, ConversationListState> {
  constructor(props: ConversationListProps) {
    super(props);
  }

  getInitialState(): ConversationListState {
    return {
      searchQuery: '',
    };
  }

  onMount(): void {
    this.attachEventListeners();
  }

  protected attachEventListeners(): void {
    if (!this.element) return;

    const searchInput = this.element.querySelector('.conversation-list__search-input') as HTMLInputElement;
    if (searchInput) {
      const handleSearch = (e: Event) => {
        const target = e.target as HTMLInputElement;
        this.setState({ searchQuery: target.value.toLowerCase() });
      };

      searchInput.addEventListener('input', handleSearch);
      this.subscriptions.push(() => {
        searchInput.removeEventListener('input', handleSearch);
      });
    }
  }

  /**
   * Filter conversations by search query
   */
  private getFilteredConversations(): Conversation[] {
    const { conversations } = this.props;
    const { searchQuery } = this.state;

    // Ensure conversations is an array
    const conversationsArray = Array.isArray(conversations) ? conversations : [];

    if (!searchQuery) {
      return conversationsArray;
    }

    return conversationsArray.filter((conv) => {
      const name = conv.recipientUsername?.toLowerCase() || '';
      const gameId = conv.gameId?.toLowerCase() || '';
      return name.includes(searchQuery) || gameId.includes(searchQuery);
    });
  }

  render(): string | HTMLElement {
    const { isLoading, activeConversationId, onSelectConversation } = this.props;
    const filteredConversations = this.getFilteredConversations();

    const container = document.createElement('div');
    container.className = 'conversation-list';

    // Search header
    const searchHtml = `
      <div class="conversation-list__header">
        <div class="conversation-list__search">
          <svg class="conversation-list__search-icon" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input 
            type="text" 
            class="conversation-list__search-input" 
            placeholder="Search conversations..." 
            value="${this.state.searchQuery}"
          />
        </div>
      </div>
    `;

    const template = document.createElement('template');
    template.innerHTML = searchHtml;
    container.appendChild(template.content);

    // Conversations list
    const listContainer = document.createElement('div');
    listContainer.className = 'conversation-list__items';

    if (isLoading) {
      listContainer.innerHTML = `
        <div class="conversation-list__loading">
          <div class="spinner"></div>
          <span>Loading conversations...</span>
        </div>
      `;
    } else if (filteredConversations.length === 0) {
      listContainer.innerHTML = `
        <div class="conversation-list__empty">
          <svg width="48" height="48" fill="currentColor" opacity="0.3" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
          <p>No conversations yet</p>
          <span class="text-muted">Start chatting with a friend</span>
        </div>
      `;
    } else {
      // Render conversation items
      filteredConversations.forEach((conversation) => {
        const item = new ConversationItem({
          conversation,
          isActive: conversation.conversationId === activeConversationId,
          onClick: onSelectConversation,
        });

        const itemElement = document.createElement('div');
        const rendered = item.render();
        if (typeof rendered === 'string') {
          itemElement.innerHTML = rendered;
          // Re-attach click handler after rendering
          const conversationItem = itemElement.querySelector('.conversation-item');
          if (conversationItem) {
            conversationItem.addEventListener('click', () => {
              onSelectConversation(conversation.conversationId);
            });
          }
        } else {
          itemElement.appendChild(rendered);
        }
        listContainer.appendChild(itemElement);
      });
    }

    container.appendChild(listContainer);
    return container;
  }
}
