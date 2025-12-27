import Component from '@/core/Component';
import type { User, UserDTOs } from '@/models';
import { appState } from '@/state';
import { userService } from '@/services/api/UserService';
import { authService } from '@/services/auth/AuthService';
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
  twoFAFlow?: 'enable';
  twoFAToken: string;
  twoFASecret?: string;
  twoFAQrCode?: string;
  is2FAWorking: boolean;
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
      twoFAFlow: undefined,
      twoFAToken: '',
      twoFASecret: undefined,
      twoFAQrCode: undefined,
      is2FAWorking: false,
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

  private readonly handleAvatarInputChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.avatarFile = file;
    this.replaceAvatarPreview(URL.createObjectURL(file));
  };

  private readonly handle2FATokenChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    // Avoid setState() here: it replaces the whole component DOM on every keystroke,
    // which looks like a page reload/flicker and can steal input focus.
    // Keep the latest value for confirm + future rerenders triggered by other actions.
    this.state.twoFAToken = input.value;
  };

  private readonly handleManage2FA = (event: Event) => {
    event.preventDefault();
    void this.start2FAFlow();
  };

  private readonly handleConfirm2FA = (event: Event) => {
    event.preventDefault();
    void this.confirm2FA();
  };

  private readonly handleCancel2FA = (event: Event) => {
    event.preventDefault();
    this.setState({
      twoFAFlow: undefined,
      twoFAToken: '',
      twoFASecret: undefined,
      twoFAQrCode: undefined,
      is2FAWorking: false,
      error: undefined,
      success: undefined,
    });
  };

  private async start2FAFlow(): Promise<void> {
    const user = this.state.user;
    if (!user || this.state.is2FAWorking) return;
    if (user.oauthProvider === '42') return;

    // Requirement: once enabled, user cannot disable 2FA from profile.
    if (user.isTwoFAEnabled) return;

    const mode: 'enable' = 'enable';

    this.setState({
      twoFAFlow: mode,
      twoFAToken: '',
      twoFASecret: undefined,
      twoFAQrCode: undefined,
      is2FAWorking: mode === 'enable',
      error: undefined,
      success: undefined,
    });

    if (mode === 'enable') {
      try {
        const { secret, qrCode } = await authService.generate2FA();
        this.setState({ twoFASecret: secret, twoFAQrCode: qrCode, is2FAWorking: false });
      } catch (error) {
        this.setState({
          error: this.getErrorMessage(error),
          is2FAWorking: false,
        });
      }
    }
  }

  private async confirm2FA(): Promise<void> {
    const user = this.state.user;
    const mode = this.state.twoFAFlow;
    if (!user || !mode || this.state.is2FAWorking) return;

    const tokenInput = this.element?.querySelector<HTMLInputElement>('[data-profile-2fa="token"]');
    const token = (tokenInput?.value ?? this.state.twoFAToken).trim();
    if (!/^\d{6}$/.test(token)) {
      this.setState({ error: 'Please enter a valid 6-digit code.', twoFAToken: token });
      return;
    }

    this.setState({ is2FAWorking: true, error: undefined, success: undefined });

    try {
      const response = await authService.enable2FA({ token });

      const refreshed = await userService.getMe();
      const auth = appState.auth.get();
      appState.auth.set({
        ...auth,
        user: refreshed,
        isAuthenticated: true,
      });

      this.setState({
        user: refreshed,
        twoFAFlow: undefined,
        twoFAToken: '',
        twoFASecret: undefined,
        twoFAQrCode: undefined,
        is2FAWorking: false,
        success:
          response?.message || 'Two-factor authentication enabled.',
      });
    } catch (error) {
      this.setState({
        error: this.getErrorMessage(error),
        is2FAWorking: false,
      });
    }
  }

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
        <main class="relative w-full px-6 pt-16 pb-20 max-w-5xl mx-auto flex flex-col gap-6">
          <div class="absolute top-20 left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
          <div class="profile-glass-panel rounded-3xl p-8 md:p-10 animate-fade-in-up">
            <p class="text-center text-text-secondary">Loading profile from the User Service…</p>
          </div>
        </main>
      `;
    }

    const user = this.state.user;

    if (!user) {
      return `
        <main class="relative w-full px-6 pt-16 pb-20 max-w-5xl mx-auto flex flex-col gap-6">
          <div class="absolute top-20 left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
          <div class="profile-glass-panel rounded-3xl p-8 md:p-10 animate-fade-in-up text-center">
            <h1 class="text-2xl font-bold text-white mb-4">Profile unavailable</h1>
            <p class="text-text-secondary mb-6">We were unable to fetch your profile from the User Service.</p>
          </div>
        </main>
      `;
    }

    const isOAuthUser = user.oauthProvider === '42';
    const status = user.status ?? 'OFFLINE';
    const avatarPreview = this.state.avatarPreview || '/assets/images/ape.png';

    return `
      <main class="relative w-full px-6 pt-16 pb-20 max-w-5xl mx-auto flex flex-col gap-6">
        <div class="absolute top-20 left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div class="absolute bottom-0 right-0 w-[40vw] h-[40vh] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        
        ${this.renderAlerts()}
        ${this.renderHeroCard(user, status, avatarPreview)}
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up" style="animation-delay: 0.2s;">
          ${this.renderFormCard(isOAuthUser, avatarPreview)}
          ${this.renderSecurityCard(isOAuthUser)}
        </div>
      </main>
    `;
  }

  private renderAlerts(): string {
    if (!this.state.error && !this.state.success) return '';
    
    const alerts: string[] = [];
    
    if (this.state.error) {
      alerts.push(`
        <div class="profile-glass-panel rounded-2xl p-4 border-red-500/30 bg-red-500/10 animate-fade-in-up" style="animation-delay: 0s;">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-red-400 text-[20px]">error</span>
            <p class="text-sm text-red-200 flex-1">${this.escape(this.state.error)}</p>
          </div>
        </div>
      `);
    }
    
    if (this.state.success) {
      alerts.push(`
        <div class="profile-glass-panel rounded-2xl p-4 border-green-500/30 bg-green-500/10 animate-fade-in-up" style="animation-delay: 0s;">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-green-400 text-[20px]">check_circle</span>
            <p class="text-sm text-green-200 flex-1">${this.escape(this.state.success)}</p>
          </div>
        </div>
      `);
    }
    
    return alerts.join('');
  }

  private renderHeroCard(user: User, status: string, avatar: string): string {
    const statusColors: Record<string, string> = {
      ONLINE: 'green',
      OFFLINE: 'red',
      AWAY: 'yellow',
      BUSY: 'orange'
    };
    
    const statusColor = statusColors[status] || 'gray';
    
    return `
      <div class="profile-glass-panel rounded-3xl p-8 md:p-10 animate-fade-in-up" style="animation-delay: 0.1s;">
        <div class="flex flex-col md:flex-row items-start justify-between gap-8">
          <div class="flex items-start gap-6">
            <div class="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 overflow-hidden shrink-0 border border-white/10 shadow-lg">
              <img alt="${this.escape(user.displayName || user.username)}" class="w-full h-full object-cover" src="${this.escape(avatar)}" onerror="this.src='/assets/images/ape.png';" />
            </div>
            <div>
              <h4 class="text-xs font-semibold tracking-widest text-text-secondary uppercase mb-2">Your Account</h4>
              <h1 class="text-3xl md:text-4xl font-bold text-white tracking-tight mb-1">${this.escape(user.displayName || user.username)}</h1>
              <div class="flex flex-col gap-1 mb-4">
                <p class="text-sm text-text-secondary">${this.escape(user.email)}</p>
                <span class="text-xs font-medium text-${statusColor}-400 bg-${statusColor}-400/10 px-2 py-0.5 rounded w-fit mt-1">${status}</span>
              </div>
              <div class="flex gap-8 mt-6">
                <div>
                  <p class="text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-1">Member Since</p>
                  <p class="text-sm text-white font-medium">${this.formatDate(user.createdAt)}</p>
                </div>
                <div>
                  <p class="text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-1">Last Update</p>
                  <p class="text-sm text-white font-medium">${this.formatDate(user.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="flex gap-3 mt-8 pt-6 border-t border-white/10">
          <button class="px-5 py-2.5 bg-blue-600/20 text-blue-200 hover:bg-blue-600/30 text-sm font-medium rounded-lg transition-colors border border-blue-500/20" data-profile-action="nav-dashboard">
            Go to dashboard
          </button>
        </div>
      </div>
    `;
  }

  private renderFormCard(isOAuthUser: boolean, avatar: string): string {
    return `
      <div class="profile-glass-panel rounded-3xl p-8 flex flex-col h-full">
        <div class="mb-6">
          <h4 class="text-xs font-semibold tracking-widest text-text-secondary uppercase mb-2">Profile</h4>
          <h2 class="text-2xl font-bold text-white tracking-tight">Edit details</h2>
          <p class="text-xs text-text-secondary mt-1 uppercase tracking-wide">Keep it short and hit save when you're ready.</p>
        </div>
        
        <div class="flex items-center gap-4 mb-8 bg-black/20 p-4 rounded-xl border border-white/5">
          <div class="w-12 h-12 rounded-lg bg-surface-highlight overflow-hidden shrink-0 border border-white/10">
            <img alt="Avatar Preview" class="w-full h-full object-cover" src="${this.escape(avatar)}" onerror="this.src='/assets/images/ape.png';" />
          </div>
          <div class="flex-1">
            <input class="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer" type="file" accept="image/*" data-action="avatar-input" />
            <p class="text-[10px] text-text-secondary mt-1">PNG or JPG, max 5MB</p>
          </div>
        </div>
        
        <form id="profile-form" class="flex-1 flex flex-col">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-text-secondary ml-1">Display name</label>
              <input 
                class="w-full rounded-lg px-3 py-2.5 text-sm bg-black/20 border border-white/10 focus:bg-black/40 focus:border-white/20 text-white transition-all" 
                type="text" 
                value="${this.escape(this.formValues.displayName)}"
                placeholder="e.g. Player One"
                data-profile-field="displayName"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-text-secondary ml-1">Username</label>
              <input 
                class="w-full rounded-lg px-3 py-2.5 text-sm bg-black/20 border border-white/10 focus:bg-black/40 focus:border-white/20 text-white transition-all" 
                type="text" 
                value="${this.escape(this.formValues.username)}"
                data-profile-field="username"
                required
              />
            </div>
          </div>
          
          <div class="space-y-1.5 mb-8">
            <label class="text-xs font-medium text-text-secondary ml-1">Email</label>
            <input 
              class="w-full rounded-lg px-3 py-2.5 text-sm bg-black/20 border border-white/10 focus:bg-black/40 focus:border-white/20 text-white transition-all ${isOAuthUser ? 'opacity-50 cursor-not-allowed' : ''}" 
              type="email" 
              value="${this.escape(this.formValues.email)}"
              data-profile-field="email"
              ${isOAuthUser ? 'disabled' : ''}
            />
            <p class="text-[10px] text-text-secondary mt-1 ml-1">
              ${isOAuthUser ? 'Email comes from 42 OAuth.' : 'Validated by the gateway before saving.'}
            </p>
          </div>
          
          <div class="mt-auto">
            <button 
              type="submit"
              class="px-6 py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] ${this.state.isSaving ? 'opacity-50 cursor-not-allowed' : ''}"
              ${this.state.isSaving ? 'disabled' : ''}
            >
              ${this.state.isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  private renderSecurityCard(isOAuthUser: boolean): string {
    const buttonLabel = this.state.user?.isTwoFAEnabled ? '2FA Enabled' : 'Enable 2FA';
    const statusLabel = this.state.user?.isTwoFAEnabled ? 'Currently enabled' : 'Currently disabled';
    const description = isOAuthUser
      ? '2FA is handled by your OAuth provider.'
      : 'Add a rotating code on top of your password to ensure your account remains secure.';

    const flow = this.state.twoFAFlow;
    const showFlow = Boolean(flow) && !isOAuthUser;
    const confirmLabel = 'Confirm enable';
      
    return `
      <div class="profile-glass-panel rounded-3xl p-8 flex flex-col h-full">
        <div class="mb-6">
          <h4 class="text-xs font-semibold tracking-widest text-text-secondary uppercase mb-2">Security</h4>
          <h2 class="text-2xl font-bold text-white tracking-tight">Two-factor authentication</h2>
        </div>
        
        <div class="flex-1">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-sm font-semibold text-white mb-1">${statusLabel}</h3>
              <p class="text-sm text-text-secondary leading-relaxed max-w-sm">
                ${description}
              </p>
            </div>
            <button 
              class="px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${isOAuthUser ? 'opacity-50 cursor-not-allowed' : ''}" 
              data-profile-action="manage-2fa"
              ${isOAuthUser || showFlow || this.state.is2FAWorking || Boolean(this.state.user?.isTwoFAEnabled) ? 'disabled' : ''}
            >
              ${buttonLabel}
            </button>
          </div>

          ${showFlow ? `
            <div class="mt-6 p-4 rounded-xl bg-black/20 border border-white/10">
              <p class="text-xs text-text-secondary mb-3">
                Scan this QR code with your authenticator app, then enter the 6-digit code.
              </p>
              ${this.state.twoFAQrCode ? `
                <div class="flex items-start gap-4">
                  <img alt="2FA QR code" class="w-28 h-28 rounded-lg bg-white p-1" src="${this.escape(this.state.twoFAQrCode)}" />
                  ${this.state.twoFASecret ? `
                    <div class="flex-1">
                      <p class="text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-1">Manual code</p>
                      <p class="text-xs text-white break-all">${this.escape(this.state.twoFASecret)}</p>
                    </div>
                  ` : ''}
                </div>
              ` : `
                <p class="text-xs text-text-secondary">Generating QR code…</p>
              `}

              <div class="mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div class="flex-1 w-full">
                  <label class="text-xs font-medium text-text-secondary ml-1">6-digit code</label>
                  <input
                    class="mt-1 w-full rounded-lg px-3 py-2.5 text-sm bg-black/20 border border-white/10 focus:bg-black/40 focus:border-white/20 text-white transition-all"
                    type="text"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    placeholder="123456"
                    value="${this.escape(this.state.twoFAToken)}"
                    data-profile-2fa="token"
                  />
                </div>
                <div class="flex gap-2">
                  <button
                    class="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-all ${this.state.is2FAWorking ? 'opacity-50 cursor-not-allowed' : ''}"
                    data-profile-action="confirm-2fa"
                    ${this.state.is2FAWorking ? 'disabled' : ''}
                  >
                    ${this.state.is2FAWorking ? 'Working…' : confirmLabel}
                  </button>
                  <button
                    class="px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
                    data-profile-action="cancel-2fa"
                    ${this.state.is2FAWorking ? 'disabled' : ''}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
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
      manage2fa.addEventListener('click', this.handleManage2FA);
      this.subscriptions.push(() => manage2fa.removeEventListener('click', this.handleManage2FA));
    }

    const tokenInput = this.element.querySelector<HTMLInputElement>('[data-profile-2fa="token"]');
    if (tokenInput) {
      tokenInput.addEventListener('input', this.handle2FATokenChange);
      this.subscriptions.push(() => tokenInput.removeEventListener('input', this.handle2FATokenChange));
    }

    const confirm2fa = this.element.querySelector<HTMLElement>('[data-profile-action="confirm-2fa"]');
    if (confirm2fa) {
      confirm2fa.addEventListener('click', this.handleConfirm2FA);
      this.subscriptions.push(() => confirm2fa.removeEventListener('click', this.handleConfirm2FA));
    }

    const cancel2fa = this.element.querySelector<HTMLElement>('[data-profile-action="cancel-2fa"]');
    if (cancel2fa) {
      cancel2fa.addEventListener('click', this.handleCancel2FA);
      this.subscriptions.push(() => cancel2fa.removeEventListener('click', this.handleCancel2FA));
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
