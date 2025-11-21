import Component from '../Component';

type Props = { start?: number; label?: string  };
type State = { count: number };

export default class TestComponent extends Component<Props, State> {
  constructor(props: Props = {}) {
    super(props);
  }

  getInitialState(): State {
    return { count: this.props.start ?? 0 };
  }

  render() {
    return [
      '<p>This is  0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000 '+  this.props.label + ' the root component rendering mixed content (HTML string + child component)</p>',
    ];
  }
  protected attachEventListeners(): void {
    this.subscriptions.forEach(u => u());
    this.subscriptions = [];

    if (!this.element) return;

    const incBtn = this.element.querySelector('.inc') as HTMLButtonElement | null;
    const decBtn = this.element.querySelector('.dec') as HTMLButtonElement | null;

    const incHandler = () => {
      this.state = { count: this.state.count + 1 };
      this.update({} as Partial<Props>);
    };

    const decHandler = () => {
      this.state = { count: this.state.count - 1 };
      this.update({} as Partial<Props>);
    };

    if (incBtn) {
      incBtn.addEventListener('click', incHandler);
      this.subscriptions.push(() => incBtn.removeEventListener('click', incHandler));
    }
    if (decBtn) {
      decBtn.addEventListener('click', decHandler);
      this.subscriptions.push(() => decBtn.removeEventListener('click', decHandler));
    }
  }
}

