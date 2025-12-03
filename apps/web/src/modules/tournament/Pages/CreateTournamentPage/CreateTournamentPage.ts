import Component from '@/core/Component';
import { navigate } from '@/routes';
import type { TournamentDTOs, TournamentSettings } from '@/models';
import { tournamentService } from '@/services/api/TournamentService';

type State = {
  form: {
    name: string;
    description: string;
    type: TournamentDTOs.CreateTournamentRequest['type'];
    maxParticipants: number;
    isPublic: boolean;
    isPowerUpsEnabled: boolean;
    maxScore: number;
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
        description: '',
        type: 'single_elimination',
        maxParticipants: 8,
        isPublic: true,
        isPowerUpsEnabled: false,
        maxScore: 11,
      },
      isSubmitting: false,
      error: undefined,
      success: undefined,
    };
  }

  private buildRequest(): TournamentDTOs.CreateTournamentRequest {
    const { form } = this.state;
    const settings: TournamentSettings = {
      gameSettings: {
        maxScore: form.maxScore,
        paddleSpeed: 8,
        ballSpeed: 6,
        powerUpsEnabled: form.isPowerUpsEnabled,
      },
      matchDuration: null,
      breakBetweenMatches: 2,
      isPublic: form.isPublic,
      requiresApproval: false,
    };

    return {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      maxParticipants: form.maxParticipants,
      settings,
      isPublic: form.isPublic,
      registrationDeadline: undefined,
    };
  }

  private async handleSubmit(): Promise<void> {
    if (this.state.isSubmitting) return;
    const request = this.buildRequest();
    if (!request.name) {
      this.setState({ error: 'Tournament name is required.' });
      return;
    }

    this.setState({ isSubmitting: true, error: undefined, success: undefined });

    try {
      const response = await tournamentService.createTournament(request);
      this.setState({
        isSubmitting: false,
        success: `Tournament "${response.tournament.name}" created.`,
        form: {
          ...this.state.form,
          name: '',
          description: '',
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
              <button
                data-action="go-games"
                class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
                style="background: rgba(255,255,255,0.08); color: white;"
              >
                Browse Games
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
          <form data-action="create-tournament" class="glass-panel p-6 space-y-5">
            <div>
              <label class="text-sm text-white/70">Tournament Name</label>
              <input
                type="text"
                name="name"
                value="${form.name}"
                class="glass-input w-full rounded-xl mt-2"
                placeholder="Neon Legends Cup"
                required
              />
            </div>
            <div>
              <label class="text-sm text-white/70">Description</label>
              <textarea
                name="description"
                rows="3"
                class="glass-input w-full rounded-xl mt-2"
                placeholder="Optional details, rules, or theme."
              >${form.description}</textarea>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-sm text-white/70">Bracket Type</label>
                <select name="type" class="glass-input w-full rounded-xl mt-2">
                  <option value="single_elimination" ${form.type === 'single_elimination' ? 'selected' : ''}>Single Elimination</option>
                  <option value="double_elimination" ${form.type === 'double_elimination' ? 'selected' : ''}>Double Elimination</option>
                  <option value="round_robin" ${form.type === 'round_robin' ? 'selected' : ''}>Round Robin</option>
                </select>
              </div>
              <div>
                <label class="text-sm text-white/70">Max Participants</label>
                <input
                  type="number"
                  name="maxParticipants"
                  min="4"
                  max="64"
                  value="${form.maxParticipants}"
                  class="glass-input w-full rounded-xl mt-2"
                />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label class="flex items-center gap-3 text-sm text-white/70">
                <input type="checkbox" name="isPublic" ${form.isPublic ? 'checked' : ''} class="rounded" />
                Public tournament (listed in discovery)
              </label>
              <label class="flex items-center gap-3 text-sm text-white/70">
                <input type="checkbox" name="isPowerUpsEnabled" ${form.isPowerUpsEnabled ? 'checked' : ''} class="rounded" />
                Enable power-ups
              </label>
            </div>
            <div>
              <label class="text-sm text-white/70">Max Score per match</label>
              <input
                type="number"
                name="maxScore"
                min="5"
                max="21"
                value="${form.maxScore}"
                class="glass-input w-full rounded-xl mt-2"
              />
            </div>
            <button
              type="submit"
              class="btn-touch w-full py-3 rounded-2xl touch-feedback font-semibold"
              style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;"
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
          description: (data.get('description') as string) ?? '',
          type: (data.get('type') as string) as State['form']['type'],
          maxParticipants: Number(data.get('maxParticipants')) || 8,
          isPublic: data.get('isPublic') === 'on',
          isPowerUpsEnabled: data.get('isPowerUpsEnabled') === 'on',
          maxScore: Number(data.get('maxScore')) || 11,
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
    bind('[data-action="go-games"]', () => navigate('/game'));
  }
}
