import { Component } from "@/components";
import { appState } from "@/state";
type State = {
};

export default class profileCard extends Component<Record<string, never>, State> {
  private unsubscribe?: () => void;

  getInitialState(): State {
    return {
      user: appState.auth.get().user,
    };
  }


onMount(): void {
  this.unsubscribe = appState.auth.subscribe((auth) => {
  });
}

  onUnmount(): void {
    this.unsubscribe?.();
  }
  protected attachEventListeners(): void {
      
  }
render(): string {
  return `
    <div class='profile-card' >    
      <div id='card-avatar'>    
          
      </div>  
        <div id='userInfos' >  
          <section  class='infosElement'  >  
                <span id='title' >  
                     Total Games  
                </span>    
                <span id='value' > 
                    9500
                </span>
          </section>  
          <section  class='infosElement'  >  
                <span id='title' >  
                     Win
                </span>    
                <span id='value' > 
                    50%
                </span>
          </section>
            <section  class='infosElement'  >  
                <span id='title' >  
                    Loss
                </span>    
                <span id='value' > 
                    50%
                </span>
          </section>
          </div> 
    </div> 
`;
}

}
