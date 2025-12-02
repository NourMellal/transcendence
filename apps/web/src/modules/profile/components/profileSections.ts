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
  const user = this.state.user || {
    tournamentWins: 0,
    matchWins: 0,
    topScore: 0,
    avatar: "/public/assets/images/ape.png",
    username: "Player Name",
  };

  return `
    <section class="profile-sections">
        <div class="friends-block" >   
          <div id='friends-header' >  
            <h2> Friends : 4  </h2>    
            <button id='add-friend-btn' >  + </button>  
          </div> 
         <div id="friends-list" class="friend-list">
              <div class="friend-item online">
                <div class="friend-avatar" style="background-image: url('https://i.pravatar.cc/40?img=1');"></div>
                <span class="friend-username">Alice</span>
                <span class="status-dot"></span>
              </div>

              <div class="friend-item offline">
                <div class="friend-avatar" style="background-image: url('https://i.pravatar.cc/40?img=2');"></div>
                <span class="friend-username">Bob</span>
                <span class="status-dot"></span>
              </div>

              <div class="friend-item online">
                <div class="friend-avatar" style="background-image: url('https://i.pravatar.cc/40?img=3');"></div>
                <span class="friend-username">Charlie</span>
                <span class="status-dot"></span>
              </div>
            </div>
        </div>    
        <div id="stats-block">  
              <div id='states-header' >   
                <h2> Stats </h2> 
              </div>   
<div id="stats-element">
        <div class="player-element">
            <div class="player-avatar" style="background-image: url('/path/to/player1-avatar.png');"></div>
            <span class="player-username">PlayerOne</span>
        </div>
        <div id="vs-element">
            <span>VS</span>
        </div>
        <div class="player-element">
            <div class="player-avatar" style="background-image: url('/path/to/player2-avatar.png');"></div>
            <span class="player-username">PlayerTwo</span>
        </div>
    </div> 
    <div id="stats-element">
        <div class="player-element">
            <div class="player-avatar" style="background-image: url('/path/to/player1-avatar.png');"></div>
            <span class="player-username">PlayerOne</span>
        </div>
        <div id="vs-element">
            <span>VS</span>
        </div>
        <div class="player-element">
            <div class="player-avatar" style="background-image: url('/path/to/player2-avatar.png');"></div>
            <span class="player-username">PlayerTwo</span>
        </div>
    </div>
    <div id="stats-element">
        <div class="player-element">
            <div class="player-avatar" style="background-image: url('/path/to/player1-avatar.png');"></div>
            <span class="player-username">PlayerOne</span>
        </div>
        <div id="vs-element">
            <span>VS</span>
        </div>
        <div class="player-element">
            <div class="player-avatar" style="background-image: url('/path/to/player2-avatar.png');"></div>
            <span class="player-username">PlayerTwo</span>
        </div>
    </div>
        </div>  
       

    </section>
  `;

  }
}
