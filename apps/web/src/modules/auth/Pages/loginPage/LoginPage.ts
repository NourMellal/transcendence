import { Component } from "../../../../core";
import { leftLogin, rightLogin } from "../../components";  

type Props = { start?: number; label?: string  ; type?:string  };
type State = { count: number };

export default class LoginPage extends Component<Props, State> { 
  constructor(props: Props = {}) {
    super(props);
  }
  getInitialState(): State {
    return { count: this.props.start ?? 0 };
  }

  render()  {
    return [
      `
      <div class="login-container" > 
      `,
      new leftLogin(),
      new rightLogin(),
      `
        </div>
      `,
    ];
  }
  protected attachEventListeners(): void {
}
}  
