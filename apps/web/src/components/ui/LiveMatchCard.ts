import { Component } from '../base/Component';
import type { LiveMatchSummary } from '../../models';

export class LiveMatchCard extends Component {
  constructor(private match: LiveMatchSummary) {
    super('article', 'glass-panel p-5 flex flex-col gap-4 min-w-[18rem]');
  }

  protected render(): void {
    const { title, league, stage, map, eta } = this.match;
    this.element.innerHTML = `
      <div class="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
        <span>${league.toUpperCase()} • ${map.replace('-', ' ')}</span>
        <span class="text-white font-semibold">${eta}</span>
      </div>
      <div>
        <h3 class="text-xl font-semibold">${title}</h3>
        <p class="text-sm text-white/70">${stage}</p>
      </div>
      <div class="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3">
        ${this.match.players
          .map(
            (player) => `
              <div class="flex flex-col items-center gap-1">
                <span class="text-base font-semibold">${player.username}</span>
                <span class="text-3xl font-bold tracking-tight">${player.score}</span>
              </div>
            `
          )
          .join('<span class="text-white/40 text-lg font-bold">:</span>')}
      </div>
      <div class="flex items-center justify-between text-sm text-white/65">
        <span>${this.match.spectators.toLocaleString()} watching</span>
        <button class="text-brand-secondary font-semibold hover:text-white transition" data-action="watch-match">
          Watch
        </button>
      </div>
    `;
  }

  update(match: LiveMatchSummary): void {
    this.match = match;
    this.render();
  }
}



