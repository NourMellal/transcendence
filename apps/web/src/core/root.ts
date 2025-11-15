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
      `<header><h1>App Root</h1></header>`,
      '<hr/>',
      // mount point for router views
      '<main id="app-view"></main>',
      `<footer><small>Mounted at #root</small></footer>`,
    ];
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach(u => u());
    this.subscriptions = [];
  }
}

