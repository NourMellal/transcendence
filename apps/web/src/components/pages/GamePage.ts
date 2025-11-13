import { Component } from '../base/Component';

/**
 * Game page component
 */
export class GamePage extends Component {
  constructor() {
    super('div', 'game-page');
  }

  protected render(): void {
    this.element.innerHTML = `
      <div style="
        max-width: 1000px;
        margin: 0 auto;
        padding: 40px 20px;
        font-family: 'Inter', system-ui, sans-serif;
        text-align: center;
      ">
        <nav style="margin-bottom: 40px;">
          <button onclick="window.location.hash = '/'" style="
            background: none;
            border: 2px solid #007bff;
            color: #007bff;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          ">← Back to Home</button>
        </nav>

        <h1 style="
          font-size: 2.5rem;
          color: #1f2937;
          margin: 0 0 16px 0;
        ">🏓 Game Arena</h1>
        
        <p style="
          color: #6b7280;
          font-size: 1.1rem;
          margin: 0 0 40px 0;
        ">Choose your game mode and start playing!</p>

        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        ">
          <div style="
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border: 1px solid #e5e7eb;
          ">
            <h3 style="color: #1f2937; margin: 0 0 12px 0;">🤖 vs AI</h3>
            <p style="color: #6b7280; margin: 0 0 20px 0;">
              Practice against our intelligent AI opponent
            </p>
            <button style="
              background: #10b981;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              width: 100%;
            ">Play vs AI</button>
          </div>

          <div style="
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border: 1px solid #e5e7eb;
          ">
            <h3 style="color: #1f2937; margin: 0 0 12px 0;">👥 Multiplayer</h3>
            <p style="color: #6b7280; margin: 0 0 20px 0;">
              Challenge other online players in real-time
            </p>
            <button style="
              background: #3b82f6;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              width: 100%;
            ">Find Match</button>
          </div>

          <div style="
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border: 1px solid #e5e7eb;
          ">
            <h3 style="color: #1f2937; margin: 0 0 12px 0;">🏆 Tournament</h3>
            <p style="color: #6b7280; margin: 0 0 20px 0;">
              Join an ongoing tournament match
            </p>
            <button onclick="window.location.hash = '/tournaments'" style="
              background: #f59e0b;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              width: 100%;
            ">Join Tournament</button>
          </div>
        </div>

        <div style="
          background: #f8fafc;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        ">
          <h4 style="color: #374151; margin: 0 0 16px 0;">Game Canvas</h4>
          <div style="
            background: #000;
            width: 100%;
            height: 300px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px;
          ">
            🏓 Game will render here
          </div>
          <p style="
            color: #6b7280;
            margin: 16px 0 0 0;
            font-size: 0.9rem;
          ">Select a game mode above to start playing</p>
        </div>
      </div>
    `;
  }
}