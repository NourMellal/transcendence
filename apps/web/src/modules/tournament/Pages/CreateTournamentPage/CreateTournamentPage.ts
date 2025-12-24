import Component from '@/core/Component';
import { navigate } from '@/routes';
import type { TournamentDTOs } from '@/models';
import { tournamentService } from '@/services/api/TournamentService';
import { validateTournamentName } from '@/utils/validation';

type State = {
  form: {
    name: string;
    isPublic: boolean;
    privatePasscode: string;
  };
  isSubmitting: boolean;
  error?: string;
  success?: string;
};

export default class CreateTournamentPage extends Component<Record<string, never>, State> {
  constructor(props: Record<string, never> = {}) {
    super(props);
  }

  getInitialState(): State {
    return {
      form: {
        name: '',
        isPublic: true,
        privatePasscode: '',
      },
      isSubmitting: false,
      error: undefined,
      success: undefined,
    };
  }

  private buildRequest(): TournamentDTOs.CreateTournamentRequest {
    const { form } = this.state;
    const privatePasscode = form.isPublic ? null : form.privatePasscode.trim() || null;
    return {
      name: form.name.trim(),
      isPublic: form.isPublic,
      privatePasscode,
      bracketType: 'single_elimination',
      maxParticipants: 8,
      minParticipants: 4,
    };
  }

  private async handleSubmit(): Promise<void> {
    if (this.state.isSubmitting) return;
    const request = this.buildRequest();
    const nameValidation = validateTournamentName(request.name);
    if (!nameValidation.isValid) {
      this.setState({ error: nameValidation.errors[0] });
      return;
    }
    if (!request.isPublic && !request.privatePasscode) {
      this.setState({ error: 'Passcode is required for private tournaments.' });
      return;
    }

    this.setState({ isSubmitting: true, error: undefined, success: undefined });

    try {
      const response = await tournamentService.createTournament(request);
      this.setState({
        isSubmitting: false,
        success: `Tournament "${response.name}" created.`,
        form: {
          ...this.state.form,
          name: '',
          privatePasscode: '',
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to create tournament.';
      this.setState({
        isSubmitting: false,
        error: message,
      });
    }
  }

  render(): string {
    const { form, isSubmitting, error, success } = this.state;

    return `
      <div class="relative min-h-screen" style="background: var(--color-bg-dark);">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-darker)] to-[#0b0d26]">
          <div class="absolute inset-0 opacity-50 cyberpunk-radial-bg"></div>
        </div>
        <div class="relative max-w-4xl mx-auto px-4 lg:px-0 py-10 space-y-6">
          <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p class="text-sm text-white/60">Tournaments</p>
              <h1 class="text-3xl font-semibold">Create Tournament</h1>
              <p class="text-sm text-white/50 mt-2">
                Spin up a cyberpunk bracket, invite friends, and crown a champion.
              </p>
            </div>
            <div class="flex gap-3">
              <button
                data-action="go-dashboard"
                class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
                style="background: rgba(255,255,255,0.08); color: white;"
              >
                ← Dashboard
              </button>
            </div>
          </header>
          ${error ? `
            <div class="glass-panel p-4" style="border:1px solid rgba(255,7,58,0.3);">
              <p class="text-sm" style="color: var(--color-error);">${error}</p>
            </div>
          ` : ''}
          ${success ? `
            <div class="glass-panel p-4" style="border:1px solid rgba(0,255,136,0.3);">
              <p class="text-sm" style="color: var(--color-success);">${success}</p>
            </div>
          ` : ''}
          <form data-action="create-tournament" class="glass-panel p-8 space-y-6">
            <div>
              <label class="block text-sm font-medium mb-3" style="color: var(--color-text-secondary);">Tournament Name</label>
              <input
                type="text"
                name="name"
                value="${form.name}"
                class="glass-input w-full rounded-xl px-5 py-4 text-base"
                style="background: var(--color-input-bg); border: 1px solid var(--color-input-border); color: var(--color-text-primary);"
                placeholder="Neon Legends Cup"
                required
              />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="rounded-xl p-5" style="background: var(--color-panel-bg); border: 1px solid var(--color-panel-border);">
                <p class="text-xs uppercase tracking-widest text-white/60">Bracket</p>
                <p class="text-lg font-semibold mt-2">Single Elimination</p>
                <p class="text-xs text-white/50 mt-1">4 players to start · 8 total slots</p>
              </div>
              <div class="rounded-xl p-5" style="background: var(--color-panel-bg); border: 1px solid var(--color-panel-border);">
                <p class="text-xs uppercase tracking-widest text-white/60">Start Rules</p>
                <p class="text-lg font-semibold mt-2">Ready at 4</p>
                <p class="text-xs text-white/50 mt-1">Auto-start at 8 or after timeout</p>
              </div>
            </div>
            <label class="flex items-center gap-3 px-5 py-4 rounded-xl cursor-pointer transition-all" style="background: var(--color-panel-bg); border: 1px solid var(--color-panel-border);">
              <input type="checkbox" name="isPublic" ${form.isPublic ? 'checked' : ''} class="w-5 h-5 rounded" style="accent-color: var(--color-brand-primary);" />
              <span class="text-sm" style="color: var(--color-text-primary);">Public tournament (shareable access code)</span>
            </label>
            ${form.isPublic ? '' : `
              <div>
                <label class="block text-sm font-medium mb-3" style="color: var(--color-text-secondary);">Private Passcode</label>
                <input
                  type="password"
                  name="privatePasscode"
                  value="${form.privatePasscode}"
                  class="glass-input w-full rounded-xl px-5 py-4 text-base"
                  style="background: var(--color-input-bg); border: 1px solid var(--color-input-border); color: var(--color-text-primary);"
                  placeholder="Enter a passcode for private invites"
                />
                <p class="text-xs text-white/50 mt-2">Players will need this passcode to join.</p>
              </div>
            `}
            <button
              type="submit"
              class="btn-touch w-full py-4 rounded-xl touch-feedback font-semibold text-lg transition-all duration-300 hover:scale-[1.02]"
              style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white; border: 1px solid rgba(255, 255, 255, 0.1);"
              ${isSubmitting ? 'disabled' : ''}
            >
              ${isSubmitting ? 'Creating...' : 'Create Tournament'}
            </button>
          </form>
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];
    if (!this.element) return;

    const form = this.element.querySelector<HTMLFormElement>('[data-action="create-tournament"]');
    if (form) {
      const submitHandler = (event: Event) => {
        event.preventDefault();
        const data = new FormData(form);
        const updatedForm: State['form'] = {
          ...this.state.form,
          name: (data.get('name') as string) ?? '',
          isPublic: data.get('isPublic') === 'on',
          privatePasscode: (data.get('privatePasscode') as string) ?? '',
        };
        this.setState({
          form: updatedForm,
          error: undefined,
          success: undefined,
        });
        void this.handleSubmit();
      };
      form.addEventListener('submit', submitHandler);
      this.subscriptions.push(() => form.removeEventListener('submit', submitHandler));
    }

    const publicToggle = this.element.querySelector<HTMLInputElement>('input[name="isPublic"]');
    if (publicToggle) {
      const toggleHandler = () => {
        this.setState({
          form: {
            ...this.state.form,
            isPublic: publicToggle.checked,
            privatePasscode: publicToggle.checked ? '' : this.state.form.privatePasscode,
          },
        });
      };
      publicToggle.addEventListener('change', toggleHandler);
      this.subscriptions.push(() => publicToggle.removeEventListener('change', toggleHandler));
    }

    const bind = (selector: string, handler: () => void) => {
      const el = this.element!.querySelector<HTMLElement>(selector);
      if (!el) return;
      const clickHandler = (event: Event) => {
        event.preventDefault();
        handler();
      };
      el.addEventListener('click', clickHandler);
      this.subscriptions.push(() => el.removeEventListener('click', clickHandler));
    };

    bind('[data-action="go-dashboard"]', () => navigate('/dashboard'));
  }
}
