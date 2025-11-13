import Component from '../components/Component';
import TestComponent from '../components/testComponent/testComponent';

type Props = { title?: string };
type State = {};

export default class TestPage extends Component<Props, State> {
  private child: TestComponent;

  constructor(props: Props = {}) {
    super(props);
    this.child = new TestComponent({ start: 1, label: 'From TestPage' });
  }

  getInitialState(): State {
    return {} as State;
  }

  // Mix HTML string content with a child Component instance
  render() {
    return [
      `<section class="test-page"><h2>${this.props.title ?? 'Test Page'}</h2>`,
      '<p>This page demonstrates mixing HTML strings and a TestComponent instance.</p>',
      this.child,
      '</section>',
    ];
  }

  protected attachEventListeners(): void {
    // no page-level listeners for this simple example
    this.subscriptions.forEach(u => u());
    this.subscriptions = [];
  }
}

