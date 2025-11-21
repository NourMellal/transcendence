import { Component } from "../../../../core";
import navBar from "../../components/navbar/navbar";
type Props = { start?: number; label?: string  };
type State = { count: number };

export default class homePage extends Component<Props, State> {
  constructor(props: Props = {}) {
    super(props);
  }

  getInitialState(): State {
    return { count: this.props.start ?? 0 };
  }

  render()  {
    return [ 
        `<div class="home-container" >  
        </div>`
    ];
  }
  protected attachEventListeners(): void {
}
}  
