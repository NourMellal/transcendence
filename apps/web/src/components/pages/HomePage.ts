import { Component } from '../base/Component';

/**
 * Dashboard/Home page component
 */
export class HomePage extends Component {
  constructor() {
    super('div', 'home-page');
  }

  protected render(): void {
    this.element.innerHTML = `
      <div style="
        max-width: 1200px;
        margin: 0 auto;
        padding: 40px 20px;
        font-family: 'Inter', system-ui, sans-serif;
      ">
        <header style="text-align: center; margin-bottom: 40px;">
          <h1 style="
            font-size: 3rem;
            font-weight: 700;
            background: linear-gradient(135deg, #007bff, #00d4ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 0 0 16px 0;
          ">🏓 Transcendence</h1>
          <p style="
            font-size: 1.2rem;
            color: #666;
            margin: 0;
          ">Welcome to the ultimate Pong gaming platform</p>
        </header>

        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        ">
          <div class="feature-card" style="
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border: 1px solid #e5e7eb;
          ">
            <h3 style="color: #1f2937; margin: 0 0 12px 0;">🎮 Play Games</h3>
            <p style="color: #6b7280; margin: 0 0 16px 0;">
              Challenge other players in classic Pong matches
            </p>
            <button onclick="window.location.hash = '/game'" style="
              background: #10b981;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            ">Start Playing</button>
          </div>

          <div class="feature-card" style="
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border: 1px solid #e5e7eb;
          ">
            <h3 style="color: #1f2937; margin: 0 0 12px 0;">🏆 Tournaments</h3>
            <p style="color: #6b7280; margin: 0 0 16px 0;">
              Compete in organized tournaments and climb the leaderboard
            </p>
            <button onclick="window.location.hash = '/tournaments'" style="
              background: #f59e0b;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            ">View Tournaments</button>
          </div>

          <div class="feature-card" style="
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border: 1px solid #e5e7eb;
          ">
            <h3 style="color: #1f2937; margin: 0 0 12px 0;">💬 Chat</h3>
            <p style="color: #6b7280; margin: 0 0 16px 0;">
              Connect with other players and join the community
            </p>
            <button onclick="window.location.hash = '/chat'" style="
              background: #8b5cf6;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            ">Join Chat</button>
          </div>

          <div class="feature-card" style="
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border: 1px solid #e5e7eb;
          ">
            <h3 style="color: #1f2937; margin: 0 0 12px 0;">👤 Profile</h3>
            <p style="color: #6b7280; margin: 0 0 16px 0;">
              Manage your profile and view your game statistics
            </p>
            <button onclick="window.location.hash = '/profile'" style="
              background: #6366f1;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            ">View Profile</button>
          </div>
        </div>

        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 32px;
          border-radius: 12px;
          text-align: center;
        ">
          <h2 style="margin: 0 0 16px 0;">Ready to Play?</h2>
          <p style="margin: 0 0 24px 0; opacity: 0.9;">
            Join thousands of players in the most exciting Pong experience ever created.
          </p>
          <button onclick="window.location.hash = '/game'" style="
            background: white;
            color: #667eea;
            border: none;
            padding: 12px 32px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 16px;
          ">Start Your First Game</button>
        </div>
      </div>
    `;
  }
}