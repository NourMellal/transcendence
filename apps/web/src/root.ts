import Component from './components/Component';
import TestComponent from './components/testComponent/testComponent';

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
        new TestComponent({label : "test"}) ,   
        new TestComponent({label : "000"}) ,   
        new TestComponent({label : "aaaa"}) ,   
      '<hr/>',
      `<footer><small>Mounted at #root</small></footer>`,
    ];
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach(u => u());
    this.subscriptions = [];
  }
}

let _mountedRoot: RootComponent | null = null;

export function mountRoot(container: string | HTMLElement = '#root') {
  if (_mountedRoot) return _mountedRoot;

  const root = new RootComponent();
  root.mount(container);
  _mountedRoot = root;
  return root;
}

try {
  if (typeof window !== 'undefined' && document) {
    const el = document.querySelector('#root');
    if (el) mountRoot(el as HTMLElement);
  }
} catch (e) {
}
