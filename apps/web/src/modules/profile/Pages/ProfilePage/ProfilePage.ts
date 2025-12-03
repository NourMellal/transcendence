import Component from '@/core/Component';
import type { User, UserDTOs } from '@/models';
import { appState } from '@/state';
import { userService } from '@/services/api/UserService';
import { navigate } from '@/routes';

type ProfileFormValues = {
  username: string;
  displayName: string;
  email: string;
};

type State = {
  user: User | null;
  isLoading: boolean;
  isSaving: boolean;
  avatarPreview: string;
  error?: string;
  success?: string;
};

export default class ProfilePage extends Component<Record<string, never>, State> {
  private unsubscribe?: () => void;
  private formValues: ProfileFormValues;
  private avatarFile?: File;
  private avatarPreviewUrl?: string;

  constructor(props: Record<string, never> = {}) {
    super(props);
    this.formValues = this.buildFormValues(this.state.user);
  }

  getInitialState(): State {
    const auth = appState.auth.get();
    return {
      user: auth.user ?? null,
      isLoading: !auth.user,
      isSaving: false,
      avatarPreview: auth.user?.avatar || '/assets/images/ape.png',
      error: undefined,
      success: undefined,
    };
  }

  onMount(): void {
    const auth = appState.auth.get();

    if (!auth.isAuthenticated) {
      navigate('/auth/login');
      return;
    }

    this.formValues = this.buildFormValues(auth.user);

    if (!auth.user) {
      void this.loadProfile();
    }

    this.unsubscribe = appState.auth.subscribe((next) => {
      if (!next.isAuthenticated) {
        navigate('/auth/login');
        return;
      }

      const shouldSyncForm =
        next.user &&
        (!this.state.user || next.user.updatedAt !== this.state.user.updatedAt);

      this.setState({
        user: next.user ?? null,
        isLoading: false,
        avatarPreview: next.user?.avatar || this.state.avatarPreview,
      });

      if (shouldSyncForm && next.user) {
        this.formValues = this.buildFormValues(next.user);
      }
    });
  }

  onUnmount(): void {
    this.unsubscribe?.();
    this.clearAvatarPreviewUrl();
  }

  private buildFormValues(user: User | null | undefined): ProfileFormValues {
    return {
      username: user?.username ?? '',
      displayName: user?.displayName ?? '',
      email: user?.email ?? '',
    };
  }

  private async loadProfile(): Promise<void> {
    this.setState({ isLoading: true, error: undefined, success: undefined });

    try {
      const profile = await userService.getMe();
      const auth = appState.auth.get();
      appState.auth.set({
        ...auth,
        user: profile,
        isAuthenticated: true,
      });
      this.formValues = this.buildFormValues(profile);
      this.setState({
        user: profile,
        isLoading: false,
        avatarPreview: profile.avatar || this.state.avatarPreview,
      });
    } catch (error) {
      this.setState({
        error: this.getErrorMessage(error),
        isLoading: false,
      });
    }
  }

  private readonly handleFormSubmit = (event: Event) => {
    event.preventDefault();
    void this.submitProfile();
  };

  private readonly handleFieldChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const field = target.dataset.profileField as keyof ProfileFormValues | undefined;
    if (!field) return;
    this.formValues = {
      ...this.formValues,
      [field]: target.value,
    };
  };

  private readonly handleReloadRequest = (event: Event) => {
    event.preventDefault();
    void this.loadProfile();
  };

  private readonly handleAvatarInputChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.avatarFile = file;
    this.replaceAvatarPreview(URL.createObjectURL(file));
  };

  private async submitProfile(): Promise<void> {
    if (this.state.isSaving || !this.state.user) return;

    const payload: UserDTOs.UpdateProfileRequest = {};
    const { user } = this.state;
    const trimmed = {
      username: this.formValues.username.trim(),
      displayName: this.formValues.displayName.trim(),
      email: this.formValues.email.trim(),
    };

    if (trimmed.username && trimmed.username !== user.username) {
      payload.username = trimmed.username;
    }
    if (trimmed.displayName && trimmed.displayName !== (user.displayName ?? '')) {
      payload.displayName = trimmed.displayName;
    }
    if (
      trimmed.email &&
      trimmed.email !== user.email &&
      user.oauthProvider !== '42'
    ) {
      payload.email = trimmed.email;
    }
    if (this.avatarFile) {
      payload.avatarFile = this.avatarFile;
    }

    if (Object.keys(payload).length === 0) {
      this.setState({
        error: undefined,
        success: 'You are already up to date.',
      });
      return;
    }

    this.setState({
      isSaving: true,
      error: undefined,
      success: undefined,
    });

    try {
      const response = await userService.updateProfile(payload);
      const updatedUser = this.mergeUserResponse(response, user);

      const auth = appState.auth.get();
      appState.auth.set({
        ...auth,
        user: updatedUser,
        isAuthenticated: true,
      });

      this.formValues = this.buildFormValues(updatedUser);
      this.avatarFile = undefined;
      this.clearAvatarPreviewUrl();
      this.setState({
        user: updatedUser,
        isSaving: false,
        avatarPreview: updatedUser.avatar || this.state.avatarPreview,
        success: response.message || 'Profile updated successfully.',
      });
    } catch (error) {
      this.setState({
        error: this.getErrorMessage(error),
        isSaving: false,
      });
    }
  }

  private mergeUserResponse(
    response: UserDTOs.UpdateProfileResponse,
    previous: User
  ): User {
    return {
      ...previous,
      id: response.id,
      username: response.username,
      email: response.email,
      displayName: response.displayName ?? previous.displayName,
      avatar: response.avatar ?? previous.avatar,
      isTwoFAEnabled: response.is2FAEnabled,
      oauthProvider: response.oauthProvider ?? previous.oauthProvider,
      updatedAt: response.updatedAt,
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: string }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }
    return 'Something went wrong while updating your profile. Please try again.';
  }

  private formatDate(value: string | undefined): string {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return value;
    }
  }

  private escape(value: string | undefined | null): string {
    if (!value) return '';
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  render(): string {
    if (this.state.isLoading) {
      return `
        <section class="profile-shell">
          <div class="glass-panel profile-shell__placeholder">
            <p>Loading profile from the User Service…</p>
          </div>
        </section>
      `;
    }

    const user = this.state.user;

    if (!user) {
      return `
        <section class="profile-shell">
          <div class="glass-panel profile-shell__placeholder">
            <h1>Profile unavailable</h1>
            <p>We were unable to fetch your profile from the User Service.</p>
            <button type="button" class="btn-primary" data-action="reload-profile">
              Retry
            </button>
          </div>
        </section>
      `;
    }

    const isOAuthUser = user.oauthProvider === '42';
    const status = user.status ?? 'OFFLINE';
    const avatarPreview = this.state.avatarPreview || '/assets/images/ape.png';
    const sections = [
      { id: 'account-section', label: 'Account' },
      { id: 'security-section', label: 'Security' },
      { id: 'preferences-section', label: 'Preferences' },
    ];

    return `
      <section class="profile-shell">
        <header class="profile-shell__header glass-panel">
          <div class="profile-shell__header-text">
            <p>Account center</p>
            <h1>Profile & Settings</h1>
            <p>Everything you change here flows through the API Gateway into the User Service.</p>
          </div>
          <div class="profile-shell__tabs">
            ${sections
              .map(
                (section) => `
                  <button class="profile-shell__tab" data-section-target="${section.id}">
                    ${section.label}
                  </button>
                `
              )
              .join('')}
          </div>
        </header>

        <div class="profile-shell__grid">
          ${this.renderSidebarCard(user, status, avatarPreview)}
          <div class="profile-shell__content">
            ${this.renderAlerts()}
            ${this.renderAccountCard(user, isOAuthUser, avatarPreview)}
            ${this.renderSecurityCard(isOAuthUser)}
            ${this.renderPreferencesCard()}
          </div>
        </div>
      </section>
    `;
  }

  private renderAlerts(): string {
    const alerts: string[] = [];
    if (this.state.error) {
      alerts.push(`
        <div class="profile-alert profile-alert--error">
          ${this.escape(this.state.error)}
        </div>
      `);
    }
    if (this.state.success) {
      alerts.push(`
        <div class="profile-alert profile-alert--success">
          ${this.escape(this.state.success)}
        </div>
      `);
    }
    return alerts.join('');
  }

  private renderSidebarCard(user: User, status: string, avatar: string): string {
    return `
      <aside class="profile-shell__aside glass-panel">
        <div class="profile-aside__identity">
          <img src="${this.escape(avatar)}" alt="${this.escape(user.displayName || user.username)}" onerror="this.src='/assets/images/ape.png';" />
          <div>
            <p class="profile-aside__name">${this.escape(user.displayName || user.username)}</p>
            <p class="profile-aside__email">${this.escape(user.email)}</p>
          </div>
        </div>
        <div class="profile-aside__meta">
          <div>
            <span>Status</span>
            <strong class="status-pill status-pill--${status.toLowerCase()}">${status}</strong>
          </div>
          <div>
            <span>Member since</span>
            <strong>${this.formatDate(user.createdAt)}</strong>
          </div>
          <div>
            <span>Last updated</span>
            <strong>${this.formatDate(user.updatedAt)}</strong>
          </div>
        </div>
        <div class="profile-aside__actions">
          <button class="btn-primary profile-aside__action" data-profile-action="nav-dashboard">Go to dashboard</button>
          <button class="btn-secondary profile-aside__action" data-action="reload-profile">Refresh data</button>
        </div>
      </aside>
    `;
  }

  private renderAccountCard(user: User, isOAuthUser: boolean, avatar: string): string {
    return `
      <section id="account-section" class="profile-section glass-panel">
        <div class="profile-section__header">
          <div>
            <p>Account</p>
            <h2>Profile details</h2>
          </div>
        </div>
        <div class="profile-account__avatar">
          <img src="${this.escape(avatar)}" alt="${this.escape(user.displayName || user.username)}" onerror="this.src='/assets/images/ape.png';" />
          <label class="avatar-upload">
            <input type="file" accept="image/*" data-action="avatar-input" />
            <span>Upload new avatar</span>
          </label>
          <p>Supported: PNG/JPG, up to 5MB.</p>
        </div>
        <form id="profile-form" class="profile-form__grid">
          <label class="form-field">
            <span>Display name</span>
            <input
              id="displayName"
              name="displayName"
              type="text"
              placeholder="e.g. Player One"
              value="${this.escape(this.formValues.displayName)}"
              data-profile-field="displayName"
            />
          </label>

          <label class="form-field">
            <span>Username</span>
            <input
              id="username"
              name="username"
              type="text"
              value="${this.escape(this.formValues.username)}"
              data-profile-field="username"
              required
            />
          </label>

          <label class="form-field${isOAuthUser ? ' is-disabled' : ''}">
            <span>Email</span>
            <input
              id="email"
              name="email"
              type="email"
              value="${this.escape(this.formValues.email)}"
              data-profile-field="email"
              ${isOAuthUser ? 'disabled' : ''}
            />
            <small class="form-field__hint">
              ${
                isOAuthUser
                  ? 'Email is managed by 42 OAuth.'
                  : 'Updates are validated in the gateway before persisting.'
              }
            </small>
          </label>

          <div class="profile-form__actions">
            <button
              type="submit"
              class="btn-primary"
              ${this.state.isSaving ? 'disabled' : ''}
            >
              ${this.state.isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>
    `;
  }

  private renderSecurityCard(isOAuthUser: boolean): string {
    return `
      <section id="security-section" class="profile-section glass-panel">
        <div class="profile-section__header">
          <div>
            <p>Security</p>
            <h2>Authentication</h2>
          </div>
        </div>
        <div class="profile-security__grid">
          <article class="profile-security__card">
            <h3>Two-factor authentication</h3>
            <p>Protect your account with a rotating code. ${
              isOAuthUser
                ? 'Managed by your OAuth provider.'
                : 'Recommended for local accounts.'
            }</p>
            <button class="btn-secondary" data-profile-action="manage-2fa">
              ${this.state.user?.isTwoFAEnabled ? 'Manage 2FA' : 'Enable 2FA'}
            </button>
          </article>
          <article class="profile-security__card">
            <h3>Session control</h3>
            <p>Sign out of other sessions or revoke refresh tokens.</p>
            <button class="profile-security__ghost" data-profile-action="logout-others">
              Log out of other devices
            </button>
          </article>
        </div>
      </section>
    `;
  }

  private renderPreferencesCard(): string {
    return `
      <section id="preferences-section" class="profile-section glass-panel">
        <div class="profile-section__header">
          <div>
            <p>Preferences</p>
            <h2>Notifications & appearance</h2>
          </div>
        </div>
        <div class="profile-preferences">
          <label class="preference-toggle">
            <div>
              <strong>Email match summaries</strong>
              <p>Receive a recap whenever a match finishes.</p>
            </div>
            <input type="checkbox" checked disabled />
          </label>
          <label class="preference-toggle">
            <div>
              <strong>Friend invite notifications</strong>
              <p>Show desktop toasts when a friend challenges you.</p>
            </div>
            <input type="checkbox" checked disabled />
          </label>
          <label class="preference-toggle">
            <div>
              <strong>Compact theme</strong>
              <p>Use tighter spacing on high-density displays.</p>
            </div>
            <input type="checkbox" disabled />
          </label>
        </div>
        <p class="preference-note">More preferences are coming soon. Everything saved here stays inside the User Service.</p>
      </section>
    `;
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];

    if (!this.element) return;

    const form = this.element.querySelector('#profile-form');
    if (form) {
      form.addEventListener('submit', this.handleFormSubmit);
      this.subscriptions.push(() =>
        form.removeEventListener('submit', this.handleFormSubmit)
      );
    }

    const inputs = this.element.querySelectorAll('[data-profile-field]');
    inputs.forEach((input) => {
      input.addEventListener('input', this.handleFieldChange);
      this.subscriptions.push(() =>
        input.removeEventListener('input', this.handleFieldChange)
      );
    });

    const reloadBtn = this.element.querySelector('[data-action="reload-profile"]');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', this.handleReloadRequest);
      this.subscriptions.push(() =>
        reloadBtn.removeEventListener('click', this.handleReloadRequest)
      );
    }

    const avatarInput = this.element.querySelector<HTMLInputElement>('input[data-action="avatar-input"]');
    if (avatarInput) {
      avatarInput.addEventListener('change', this.handleAvatarInputChange);
      this.subscriptions.push(() =>
        avatarInput.removeEventListener('change', this.handleAvatarInputChange)
      );
    }

    const sectionButtons = this.element.querySelectorAll<HTMLElement>('[data-section-target]');
    sectionButtons.forEach((button) => {
      const handler = (event: Event) => {
        event.preventDefault();
        const target = button.getAttribute('data-section-target');
        if (target) {
          this.scrollToSection(target);
        }
      };
      button.addEventListener('click', handler);
      this.subscriptions.push(() => button.removeEventListener('click', handler));
    });

    const dashboardBtn = this.element.querySelector<HTMLElement>('[data-profile-action="nav-dashboard"]');
    if (dashboardBtn) {
      const handler = (event: Event) => {
        event.preventDefault();
        navigate('/dashboard');
      };
      dashboardBtn.addEventListener('click', handler);
      this.subscriptions.push(() => dashboardBtn.removeEventListener('click', handler));
    }

    const manage2fa = this.element.querySelector<HTMLElement>('[data-profile-action="manage-2fa"]');
    if (manage2fa) {
      const handler = (event: Event) => {
        event.preventDefault();
        console.info('[ProfilePage] 2FA management flow not yet implemented.');
      };
      manage2fa.addEventListener('click', handler);
      this.subscriptions.push(() => manage2fa.removeEventListener('click', handler));
    }

    const logoutOthers = this.element.querySelector<HTMLElement>('[data-profile-action="logout-others"]');
    if (logoutOthers) {
      const handler = (event: Event) => {
        event.preventDefault();
        console.info('[ProfilePage] Session revocation coming soon.');
      };
      logoutOthers.addEventListener('click', handler);
      this.subscriptions.push(() => logoutOthers.removeEventListener('click', handler));
    }
  }

  private scrollToSection(sectionId: string): void {
    const element = this.element?.querySelector<HTMLElement>(`#${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private replaceAvatarPreview(nextPreview: string) {
    this.clearAvatarPreviewUrl();
    this.avatarPreviewUrl = nextPreview;
    this.setState({ avatarPreview: nextPreview });
  }

  private clearAvatarPreviewUrl() {
    if (this.avatarPreviewUrl) {
      URL.revokeObjectURL(this.avatarPreviewUrl);
      this.avatarPreviewUrl = undefined;
    }
  }
}
