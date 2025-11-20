import { Component } from '../base/Component';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export class ComingSoonPage extends Component {
  constructor(private props: ComingSoonProps) {
    super('section', 'min-h-screen flex items-center justify-center bg-brand-dark text-white mobile-xs-px-4 p-6 safe-area-inset');
    
    // Add touch device detection
    this.detectTouchDevice();
  }

  private detectTouchDevice(): void {
    // Add touch device class for CSS targeting
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('touch-device');
    }
  }

  protected render(): void {
    const { title, description } = this.props;
    this.element.innerHTML = `
      <div class="glass-panel-mobile sm:glass-panel sm:p-10 max-w-2xl text-center mobile-section-spacing">
        <p class="text-sm uppercase tracking-[0.3em] text-white/50">Transcendence</p>
        <h1 class="text-responsive-title sm:text-4xl font-semibold">${title}</h1>
        <p class="text-white/70 mobile-xs-px-4">${description ?? 'This view is almost ready. Check back soon!'}</p>
        <a
          href="/"
          class="btn-touch inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 font-semibold text-white transition hover:shadow-lg hover:bg-brand-secondary touch-feedback"
        >
          Return Home
        </a>
      </div>
    `;
  }
}



