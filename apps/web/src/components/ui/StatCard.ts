import { Component } from '../base/Component';

export interface StatCardProps {
  metric: string;
  label: string;
  hint: string;
  icon: string;
  accent: string;
  suffix?: string;
  format?: (value: number) => string;
}

export class StatCard extends Component {
  private value = 0;

  constructor(private props: StatCardProps) {
    super('article', 'relative glass-panel p-6 overflow-hidden');
  }

  protected render(): void {
    const { icon, label, hint, accent } = this.props;
    this.element.innerHTML = `
      <div class="absolute inset-px rounded-[22px] bg-gradient-to-br ${accent} opacity-20"></div>
      <div class="relative flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span class="text-lg text-white/70">${label}</span>
          <span class="text-2xl">${icon}</span>
        </div>
        <div>
          <p data-role="value" class="text-4xl font-semibold tracking-tight text-white drop-shadow-lg">
            ${this.formatValue(this.value)}
          </p>
          <p class="text-sm text-white/60 mt-1">${hint}</p>
        </div>
      </div>
    `;
  }

  setValue(value: number): void {
    this.value = value;
    const node = this.element.querySelector<HTMLElement>('[data-role="value"]');
    if (node) {
      node.textContent = this.formatValue(value);
    }
  }

  private formatValue(value: number): string {
    if (this.props.format) {
      return this.props.format(value);
    }
    const suffix = this.props.suffix ?? '';
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k${suffix}`;
    }
    return `${value}${suffix}`;
  }
}



