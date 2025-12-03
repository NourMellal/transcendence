import Component from '@/core/Component';
import { navigate, approuter } from '@/routes';

type NavItem = {
  label: string;
  description: string;
  path: string;
  icon: 'profile' | 'game' | 'home';
};

type State = {
  activePath: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    description: 'Return to landing page',
    path: '/',
    icon: 'home',
  },
  {
    label: 'My Profile',
    description: 'Personal info and preferences',
    path: '/profile',
    icon: 'profile',
  },
  {
    label: 'Play Game',
    description: 'Jump back into a match',
    path: '/game',
    icon: 'game',
  },
];

export default class AppSidebar extends Component<Record<string, never>, State> {
  private routerUnsubscribe?: () => void;

  getInitialState(): State {
    return {
      activePath: window.location.pathname,
    };
  }

  onMount(): void {
    this.routerUnsubscribe = approuter.onRoute(() => {
      this.setState({ activePath: window.location.pathname });
    });
  }

  onUnmount(): void {
    this.routerUnsubscribe?.();
  }

  render(): string {
    return `
      <nav class="app-sidebar glass-panel">
        <div class="app-sidebar__group">
          <p class="app-sidebar__label">Navigation</p>
          <div class="app-sidebar__links">
            ${NAV_ITEMS.map((item) => this.renderLink(item)).join('')}
          </div>
        </div>
      </nav>
    `;
  }

  private renderLink(item: NavItem): string {
    const isActive = this.state.activePath === item.path;
    return `
      <button
        class="app-sidebar__link ${isActive ? 'is-active' : ''}"
        data-route="${item.path}"
        aria-current="${isActive ? 'page' : 'false'}"
      >
        <span class="app-sidebar__icon">
          ${this.renderIcon(item.icon)}
        </span>
        <span>
          <span class="app-sidebar__link-label">${item.label}</span>
          <span class="app-sidebar__link-desc">${item.description}</span>
        </span>
      </button>
    `;
  }

  private renderIcon(icon: NavItem['icon']): string {
    switch (icon) {
      case 'profile':
        return `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
            <path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
              d="M17 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
            <circle cx="9" cy="7" r="3" stroke="currentColor" stroke-width="1.5" />
            <path d="M15 11c2.21 0 4-1.79 4-4V6a4 4 0 0 0-4-4" stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" />
            <path d="M19 21v-2a4 4 0 0 0-2-3.464" stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" />
          </svg>
        `;
      case 'game':
        return `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
            <path d="M7 12h4m-2-2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <circle cx="16.5" cy="10.5" r="1" fill="currentColor" />
            <circle cx="18.5" cy="13.5" r="1" fill="currentColor" />
            <path d="M5 18 8.586 14.414a2 2 0 0 1 1.414-.586h3a2 2 0 0 1 1.414.586L18 18"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path d="M4 8V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v1" stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" />
          </svg>
        `;
      case 'home':
      default:
        return `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
            <path d="M3 11.5 12 4l9 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
              stroke-linejoin="round" />
            <path d="M5 10v10h14V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        `;
    }
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];

    if (!this.element) return;

    const buttons = this.element.querySelectorAll<HTMLButtonElement>('[data-route]');
    buttons.forEach((btn) => {
      const handler = (event: Event) => {
        event.preventDefault();
        const target = event.currentTarget as HTMLButtonElement;
        const destination = target.dataset.route;
        if (destination) {
          navigate(destination);
        }
      };
      btn.addEventListener('click', handler);
      this.subscriptions.push(() => btn.removeEventListener('click', handler));
    });
  }
}
