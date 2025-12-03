import Component from './Component';
import { AppHeader, AppSidebar, AppFooter } from '@/components/layout';
import { appState } from '@/state';

type Props = {};
type State = {
  isAuthenticated: boolean;
};

export default class RootComponent extends Component<Props, State> {
  private header?: AppHeader;
  private sidebar?: AppSidebar;
  private footer?: AppFooter;
  private authUnsubscribe?: () => void;
  private layoutActive = false;

  constructor(props: Props = {}) {
    super(props);
  }

  getInitialState(): State {
    const auth = appState.auth.get();
    return {
      isAuthenticated: auth.isAuthenticated,
    };
  }

  render() {
    const attr = this.state.isAuthenticated ? 'true' : 'false';
    return `
      <div id="app-shell" class="app-shell" data-authenticated="${attr}">
        <header id="app-header" class="app-shell__header"></header>
        <div class="app-shell__body">
          <aside id="app-sidebar" class="app-shell__sidebar"></aside>
          <section id="app-content" class="app-shell__content">
            <div id="app-view"></div>
          </section>
        </div>
        <footer id="app-footer" class="app-shell__footer"></footer>
      </div>
    `;
  }

  onMount(): void {
    this.authUnsubscribe = appState.auth.subscribe((auth) => {
      this.state = { ...this.state, isAuthenticated: auth.isAuthenticated };
      this.updateShellAttribute(auth.isAuthenticated);
      this.syncLayout(auth.isAuthenticated);
    });

    this.updateShellAttribute(this.state.isAuthenticated);
    this.syncLayout(this.state.isAuthenticated);
  }

  onUnmount(): void {
    this.teardownLayout();
    this.authUnsubscribe?.();
  }

  private updateShellAttribute(isAuthenticated: boolean): void {
    if (!this.element) return;
    this.element.setAttribute(
      'data-authenticated',
      isAuthenticated ? 'true' : 'false'
    );
  }

  private syncLayout(isAuthenticated: boolean): void {
    if (!this.element) return;

    if (isAuthenticated && !this.layoutActive) {
      this.layoutActive = true;
      this.mountLayout();
    } else if (!isAuthenticated && this.layoutActive) {
      this.layoutActive = false;
      this.teardownLayout();
    }
  }

  private mountLayout(): void {
    if (!this.element) return;

    const headerSlot = this.element.querySelector('#app-header');
    if (headerSlot && !this.header) {
      this.header = new AppHeader({});
      this.header.mount(headerSlot as HTMLElement);
    }

    const sidebarSlot = this.element.querySelector('#app-sidebar');
    if (sidebarSlot && !this.sidebar) {
      this.sidebar = new AppSidebar({});
      this.sidebar.mount(sidebarSlot as HTMLElement);
    }

    const footerSlot = this.element.querySelector('#app-footer');
    if (footerSlot && !this.footer) {
      this.footer = new AppFooter({});
      this.footer.mount(footerSlot as HTMLElement);
    }
  }

  private teardownLayout(): void {
    this.header?.unmount();
    this.sidebar?.unmount();
    this.footer?.unmount();

    this.header = undefined;
    this.sidebar = undefined;
    this.footer = undefined;

    if (this.element) {
      ['#app-header', '#app-sidebar', '#app-footer'].forEach((selector) => {
        const slot = this.element!.querySelector(selector) as HTMLElement | null;
        if (slot) slot.innerHTML = '';
      });
    }
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach(u => u());
    this.subscriptions = [];
  }
}
