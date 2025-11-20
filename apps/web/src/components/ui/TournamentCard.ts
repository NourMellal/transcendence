import { Component } from '../base/Component';
import type { TournamentHighlight } from '../../models';

export class TournamentCard extends Component {
  constructor(private tournament: TournamentHighlight) {
    super('article', 'glass-panel p-6 flex flex-col gap-4');
  }

  protected render(): void {
    this.element.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="px-3 py-1 rounded-full text-xs font-semibold ${
          this.getStatusBadgeClasses()
        }">${this.tournament.status.toUpperCase()}</span>
        <span class="text-sm text-white/60">${this.tournament.region} REGION</span>
      </div>
      <div>
        <h3 class="text-2xl font-semibold tracking-tight">${this.tournament.name}</h3>
        <p class="text-sm text-white/60">Starts ${this.formatDate(this.tournament.startDate)}</p>
      </div>
      <div class="flex items-center justify-between text-sm">
        <div>
          <p class="text-white/60">Prize Pool</p>
          <p class="text-xl font-semibold">$${this.tournament.prizePool.toLocaleString()}</p>
        </div>
        <div class="text-right">
          <p class="text-white/60">Slots</p>
          <p class="text-xl font-semibold">
            ${this.tournament.slots.taken}/${this.tournament.slots.total}
          </p>
        </div>
      </div>
      <button
        class="mt-2 inline-flex items-center justify-center rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
        data-action="join-tournament"
      >
        View Bracket
      </button>
    `;
  }

  update(tournament: TournamentHighlight): void {
    this.tournament = tournament;
    this.render();
  }

  private getStatusBadgeClasses(): string {
    switch (this.tournament.status) {
      case 'registration':
        return 'bg-success/15 text-success border border-success/20';
      case 'finals':
        return 'bg-brand-accent/15 text-brand-accent border border-brand-accent/30';
      default:
        return 'bg-brand-secondary/15 text-brand-secondary border border-brand-secondary/25';
    }
  }

  private formatDate(date: string): string {
    return new Date(date).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
}



