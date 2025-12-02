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
                <!-- Player 1 -->
                <div class="player-element winner">
                    <div class="player-avatar" style="background-image: url('/path/to/player1-avatar.png');"></div>
                    <span class="player-username">PlayerOne</span>
                    <div class="winner-badge">🏆 Winner</div>
                </div>

                <!-- VS -->
                <div id="vs-element">
                    <span>VS</span>
                </div>

                <!-- Player 2 -->
                <div class="player-element">
                    <div class="player-avatar" style="background-image: url('/path/to/player2-avatar.png');"></div>
                    <span class="player-username">PlayerTwo</span>
                </div>
            </div>
            <div id="stats-element">
                <!-- Player 1 -->
                <div class="player-element winner">
                    <div class="player-avatar" style="background-image: url('/path/to/player1-avatar.png');"></div>
                    <span class="player-username">PlayerOne</span>
                    <div class="winner-badge">🏆 Winner</div>
                </div>

                <!-- VS -->
                <div id="vs-element">
                    <span>VS</span>
                </div>

                <!-- Player 2 -->
                <div class="player-element">
                    <div class="player-avatar" style="background-image: url('/path/to/player2-avatar.png');"></div>
                    <span class="player-username">PlayerTwo</span>
                </div>
            </div>
            <div id="stats-element">
                <!-- Player 1 -->
                <div class="player-element winner">
                    <div class="player-avatar" style="background-image: url('/path/to/player1-avatar.png');"></div>
                    <span class="player-username">PlayerOne</span>
                    <div class="winner-badge">🏆 Winner</div>
                </div>

                <!-- VS -->
                <div id="vs-element">
                    <span>VS</span>
                </div>

                <!-- Player 2 -->
                <div class="player-element">
                    <div class="player-avatar" style="background-image: url('/path/to/player2-avatar.png');"></div>
                    <span class="player-username">PlayerTwo</span>
                </div>
            </div>
        </div>    
<div id="leaderboard-block">
  <div id="leaderboard-header">
    <h2>Leaderboard</h2>
  </div>

  <div id="leaderboard-list">

      <!-- GOLD -->
      <div class="leader-card first">
        <div class="rank">1</div>
        <img class="avatar" src="https://i.pravatar.cc/60?img=4" />
        <div class="info">
          <span class="name">Dave</span>
          <span class="score">1200 pts</span>
        </div>
      </div>

      <!-- SILVER -->
      <div class="leader-card second">
        <div class="rank">2</div>
        <img class="avatar" src="https://i.pravatar.cc/60?img=3" />
        <div class="info">
          <span class="name">Sarah</span>
          <span class="score">1100 pts</span>
        </div>
      </div>

      <!-- BRONZE -->
      <div class="leader-card third">
        <div class="rank">3</div>
        <img class="avatar" src="https://i.pravatar.cc/60?img=6" />
        <div class="info">
          <span class="name">Leo</span>
          <span class="score">900 pts</span>
        </div>
      </div>

      <!-- NORMAL REST -->
      <div class="leader-card normal">
        <div class="rank">4</div>
        <img class="avatar" src="https://i.pravatar.cc/60?img=7" />
        <div class="info">
          <span class="name">Anna</span>
          <span class="score">750 pts</span>
        </div>
      </div>

  </div>
</div>

    </section>s
  `;

  }
}
