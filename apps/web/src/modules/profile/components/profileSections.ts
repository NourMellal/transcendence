import { Component } from "@/components";
import { appState } from "@/state";

type State = {
  user: {
    tournamentWins: number;
    matchWins: number;
    topScore: number;
    avatar?: string;
    username?: string;
  };
};

export default class profileSections extends Component<Record<string, never>, State> {
  private unsubscribe?: () => void;

  getInitialState(): State {
    return {
      user: appState.auth.get().user,
    };
  }

  onMount(): void {
    this.unsubscribe = appState.auth.subscribe((auth) => {
      this.setState({ user: auth.user });
    });
  }

  onUnmount(): void {
    this.unsubscribe?.();
  }

  protected attachEventListeners(): void {}

  render(): string {
   const user = this.state.user || { tournamentWins: 0, matchWins: 0, topScore: 0 };
    return `
      <div class='profile-sections'>  
        <div class='profile-sections-left'>  
          <p id='left-section-header'>  
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" height="20px" width="20px" viewBox="0 0 64 64"><circle fill="#1c71d8" cx="32" cy="32" r="32"/></svg>                            
            <span>About Player</span>  
          </p>  

          <div class="player-avatar" style="background-image: url('${user.avatar || "/public/assets/images/ape.png"}');"></div>

          <div class="player-info">
            <h2>${user.username || "Player Name"}</h2>

            <div class="stats">
              <div class="stat">
                <div class="label">Tournament Wins</div>
                <div class="value"> 44 </div>
              </div>
              <div class="stat">
                <div class="label">Match Wins</div>
                <div class="value">115</div>
              </div>
              <div class="stat">
                <div class="label">Top Score</div>
                <div class="value">1800</div>
              </div>
            </div>
          </div>
        </div>     

        <div class='profile-sections-right'>    
          <div class='profile-sections-item'></div> 
          <div class='profile-sections-item'></div> 
          <div class='profile-sections-item'></div>  
        </div> 
      </div>
    `;
  }
}
