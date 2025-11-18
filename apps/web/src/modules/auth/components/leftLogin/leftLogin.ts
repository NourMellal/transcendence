import { Component } from "../../../../core";
type Props = { start?: number; label?: string  };
type State = { count: number };

export default class leftLogin extends Component<Props, State> {
  constructor(props: Props = {}) {
    super(props);
  }

  getInitialState(): State {
    return { count: this.props.start ?? 0 };
  }

  render()  {
    return [
      `
      <div class='left-login'>
      </div>
      `
    ];
  }
  protected attachEventListeners(): void {
}
}  
