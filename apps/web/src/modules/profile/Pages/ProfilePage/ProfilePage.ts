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

  private async fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error('Failed to process file'));
      reader.readAsDataURL(file);
    });
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
      payload.avatar = await this.fileToDataUrl(this.avatarFile);
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
            <button type="button" class="btn-secondary" data-action="reload-profile">
              Retry
            </button>
          </div>
        </section>
      `;
    }

    const isOAuthUser = user.oauthProvider === '42';
    const status = user.status ?? 'OFFLINE';
    const avatarPreview = this.state.avatarPreview || '/assets/images/ape.png';

    const alerts = this.renderAlerts();

    return `
      <section class="profile-shell profile-shell--simple">
        <div class="profile-simple-grid">
          ${this.renderHeroCard(user, status, avatarPreview)}
          ${alerts ? `<div class="glass-panel profile-simple__card profile-simple__card--alerts">${alerts}</div>` : ''}
          ${this.renderFormCard(isOAuthUser, avatarPreview)}
          ${this.renderSecurityCard(isOAuthUser)}
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

  private renderHeroCard(user: User, status: string, avatar: string): string {
    return `
      <header class="glass-panel profile-simple__card profile-simple__card--hero">
        <div class="profile-simple__identity">
          <img src="${this.escape(avatar)}" alt="${this.escape(user.displayName || user.username)}" onerror="this.src='/assets/images/ape.png';" />
          <div>
            <p class="profile-simple__eyebrow">Your account</p>
            <h1>${this.escape(user.displayName || user.username)}</h1>
            <p>${this.escape(user.email)}</p>
            <span class="status-pill status-pill--${status.toLowerCase()}">${status}</span>
          </div>
        </div>
        <dl class="profile-simple__meta">
          <div>
            <dt>Member since</dt>
            <dd>${this.formatDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt>Last update</dt>
            <dd>${this.formatDate(user.updatedAt)}</dd>
          </div>
        </dl>
        <div class="profile-simple__actions">
          <button class="btn-primary" data-profile-action="nav-dashboard">Go to dashboard</button>
          <button class="btn-secondary" data-action="reload-profile">Refresh</button>
        </div>
      </header>
    `;
  }

  private renderFormCard(isOAuthUser: boolean, avatar: string): string {
    return `
      <section class="glass-panel profile-simple__card profile-simple__card--form">
        <div class="profile-section__header">
          <div>
            <p>Profile</p>
            <h2>Edit details</h2>
          </div>
          <p class="profile-simple__hint">Keep it short and hit save when you're ready.</p>
        </div>
        <div class="profile-account__avatar">
          <img src="${this.escape(avatar)}" alt="${this.escape(this.state.user?.displayName || this.state.user?.username || 'Avatar')}" onerror="this.src='/assets/images/ape.png';" />
          <label class="avatar-upload">
            <input type="file" accept="image/*" data-action="avatar-input" />
            <span>Upload new avatar</span>
          </label>
          <p>PNG or JPG, max 5MB.</p>
        </div>
        <form id="profile-form" class="profile-form__grid profile-simple__form">
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
              ${isOAuthUser ? 'Email comes from 42 OAuth.' : 'Validated by the gateway before saving.'}
            </small>
          </label>

          <div class="profile-form__actions">
            <button
              type="submit"
              class="btn-secondary"
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
    const buttonLabel = this.state.user?.isTwoFAEnabled ? 'Manage 2FA' : 'Enable 2FA';
    const description = isOAuthUser
      ? '2FA is handled by your OAuth provider.'
      : 'Add a rotating code on top of your password.';
    return `
      <section class="glass-panel profile-simple__card profile-simple__card--security">
        <div class="profile-section__header">
          <div>
            <p>Security</p>
            <h2>Two-factor authentication</h2>
          </div>
        </div>
        <div class="profile-simple__security">
          <div>
            <strong>${this.state.user?.isTwoFAEnabled ? 'Currently enabled' : 'Currently disabled'}</strong>
            <p>${description}</p>
          </div>
          <button class="btn-secondary" data-profile-action="manage-2fa" ${isOAuthUser ? 'disabled' : ''}>
            ${buttonLabel}
          </button>
        </div>
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
