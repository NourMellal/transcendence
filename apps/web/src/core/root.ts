import Component from './Component';

type Props = {};
type State = {};

export default class RootComponent extends Component<Props, State> {
  constructor(props: Props = {}) {
    super(props);
  }
  getInitialState(): State {
    return {} as State;
  }

  render() {
    return [
      '<main id="app-view" style="min-height: 100vh; width: 100%;"></main>',
    ];
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach(u => u());
    this.subscriptions = [];
  }
}

