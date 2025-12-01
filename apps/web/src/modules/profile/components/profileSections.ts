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
      
      <!-- LEFT SECTION: Player Info -->
      <aside class="profile-sections-left">
        <header id="left-section-header">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" height="20px" width="20px" viewBox="0 0 64 64">
            <circle fill="#1c71d8" cx="32" cy="32" r="32"/>
          </svg>
          <span>About Player</span>
        </header>

        <div class="player-avatar" style="background-image: url('${user.avatar}');"></div>

        <div class="player-info">
          <h2 class="player-username">${user.username}</h2>

          <ul class="player-stats">
            <li class="stat">
              <span class="label">Tournament Wins</span>
              <span class="value">${user.tournamentWins}</span>
            </li>
            <li class="stat">
              <span class="label">Match Wins</span>
              <span class="value">${user.matchWins}</span>
            </li>
            <li class="stat">
              <span class="label">Top Score</span>
              <span class="value">${user.topScore}</span>
            </li>
          </ul>
        </div>
      </aside>
      
      <!-- RIGHT SECTION: Cards -->
      <section class="profile-sections-right">
        <article class="profile-sections-item">
          <h3>Recent Matches</h3>
          <ul class="matches-list">
            <li>Won vs PlayerA (21-18)</li>
            <li>Lost vs PlayerB (15-21)</li>
            <li>Won vs PlayerC (21-10)</li>
          </ul>
        </article>

        <article class="profile-sections-item">
          <h3>Leaderboard</h3>
          <ol class="leaderboard-list">
            <li>PlayerX - 2500 pts</li>
            <li>PlayerY - 2400 pts</li>
            <li>${user.username} - ${user.topScore} pts</li>
          </ol>
        </article>

        <article class="profile-sections-item">
          <h3>Achievements</h3>
          <ul class="achievements-list">
            <li>First Tournament Win</li>
            <li>Highest Score in Match</li>
            <li>Top 10 Global Ranking</li>
          </ul>
        </article>
      </section>

    </section>
  `;

  }
}
