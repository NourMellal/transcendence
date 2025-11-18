import Component from '../components/Component';
import TestComponent from '../components/testComponent/testComponent';

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
      '<main id="app-view"></main>',
    ];
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach(u => u());
    this.subscriptions = [];
  }
}

