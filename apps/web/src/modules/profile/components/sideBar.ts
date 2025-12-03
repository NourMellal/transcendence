import { Component } from "@/components";
import { appState } from "@/state";
type State = {
};

export default class sideBar extends Component<Record<string, never>, State> {
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
 <div class="logo">Transcendence 🏓</div>

<div class="status">
    <span class="dot online"></span> Connected<br>
    <span class="dot online"></span> 25 Players Online
</div>

<div class="section">
    <div class="section-title">Dashboard</div>
    <a href="#" class="item">🏠 Home</a>
    <a href="#" class="item">🏆 Rankings</a>
    <a href="#" class="item">👤 Profile</a>
</div>

<div class="section">
    <div class="section-title">Matchmaking</div>
    <a class="item">⚡ Quick Match</a>
    <a class="item">🎯 Ranked Match</a>
    <a class="item">🤝 Friendly Match</a>
</div>

<div class="section">
    <div class="section-title">Game Rooms</div>
    <a class="item">🏓 1v1 Arena <span class="tag blue"></span></a>
    <a class="item">🔥 Challenger Room <span class="tag gold"></span></a>
    <a class="item">🌌 Infinite Room <span class="tag silver"></span></a>
    <a class="item">＋ Create Room</a>
</div>

<div class="section">
    <div class="section-title">Information</div>
    <a class="item">📜 Game Rules</a>
    <a class="item">🎧 Support</a>
</div>

<div class="solana-box">
    <div class="price">
        Token: $PONG <span class="green">+12.7%</span>
    </div>
    <div class="tx">1,240 Matches Today</div>
</div>

        `;
  }
}
