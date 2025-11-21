import { Component } from "../../../../core";
import loginForm from "../loginForm/loginForm";
type Props = { start?: number; label?: string  };
type State = { count: number };

export default class rightLogin extends Component<Props, State> {
  constructor(props: Props = {}) {
    super(props);
  }

  getInitialState(): State {
    return { count: this.props.start ?? 0 };
  }

  render()  {
    return [
      `<div class="right-login"> `, 
        `<div id="form-header">
          <span>Transcendence test login</span>
        </div>` ,  
        new loginForm() ,  
      `</div>`,
    ];
  }
  protected attachEventListeners(): void {
}
}  
