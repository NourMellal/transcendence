import { Component } from '../base/Component';

/**
 * Profile page component  
 */
export class ProfilePage extends Component {
  constructor() {
    super('div', 'profile-page');
  }

  protected render(): void {
    this.element.innerHTML = `
      <div style="
        max-width: 800px;
        margin: 0 auto;
        padding: 40px 20px;
        font-family: 'Inter', system-ui, sans-serif;
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

        <div style="
          background: white;
          padding: 32px;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          margin-bottom: 24px;
        ">
          <div style="display: flex; align-items: center; margin-bottom: 24px;">
            <div style="
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, #667eea, #764ba2);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 2rem;
              margin-right: 24px;
            ">👤</div>
            <div>
              <h1 style="margin: 0 0 8px 0; color: #1f2937;">John Doe</h1>
              <p style="margin: 0; color: #6b7280;">Level 15 • Pong Master</p>
            </div>
          </div>

          <div style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
          ">
            <div style="text-align: center; padding: 16px;">
              <div style="font-size: 2rem; font-weight: 700; color: #10b981;">247</div>
              <div style="color: #6b7280; font-size: 0.9rem;">Games Won</div>
            </div>
            <div style="text-align: center; padding: 16px;">
              <div style="font-size: 2rem; font-weight: 700; color: #f59e0b;">89</div>
              <div style="color: #6b7280; font-size: 0.9rem;">Games Lost</div>
            </div>
            <div style="text-align: center; padding: 16px;">
              <div style="font-size: 2rem; font-weight: 700; color: #3b82f6;">73%</div>
              <div style="color: #6b7280; font-size: 0.9rem;">Win Rate</div>
            </div>
            <div style="text-align: center; padding: 16px;">
              <div style="font-size: 2rem; font-weight: 700; color: #8b5cf6;">12</div>
              <div style="color: #6b7280; font-size: 0.9rem;">Tournaments</div>
            </div>
          </div>
        </div>

        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        ">
          <div style="
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          ">
            <h3 style="margin: 0 0 16px 0; color: #1f2937;">Recent Matches</h3>
            <div style="space-y: 12px;">
              <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                background: #f8fafc;
                border-radius: 8px;
                margin-bottom: 8px;
              ">
                <span style="color: #374151;">vs Alice</span>
                <span style="color: #10b981; font-weight: 600;">Won 21-15</span>
              </div>
              <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                background: #f8fafc;
                border-radius: 8px;
                margin-bottom: 8px;
              ">
                <span style="color: #374151;">vs Bob</span>
                <span style="color: #ef4444; font-weight: 600;">Lost 18-21</span>
              </div>
              <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                background: #f8fafc;
                border-radius: 8px;
              ">
                <span style="color: #374151;">vs Charlie</span>
                <span style="color: #10b981; font-weight: 600;">Won 21-12</span>
              </div>
            </div>
          </div>

          <div style="
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          ">
            <h3 style="margin: 0 0 16px 0; color: #1f2937;">Achievements</h3>
            <div style="space-y: 12px;">
              <div style="
                display: flex;
                align-items: center;
                padding: 12px;
                background: #fef3c7;
                border-radius: 8px;
                margin-bottom: 8px;
              ">
                <span style="margin-right: 12px; font-size: 1.2rem;">🏆</span>
                <span style="color: #92400e;">Tournament Champion</span>
              </div>
              <div style="
                display: flex;
                align-items: center;
                padding: 12px;
                background: #dbeafe;
                border-radius: 8px;
                margin-bottom: 8px;
              ">
                <span style="margin-right: 12px; font-size: 1.2rem;">🔥</span>
                <span style="color: #1e40af;">10 Win Streak</span>
              </div>
              <div style="
                display: flex;
                align-items: center;
                padding: 12px;
                background: #dcfce7;
                border-radius: 8px;
              ">
                <span style="margin-right: 12px; font-size: 1.2rem;">⚡</span>
                <span style="color: #166534;">Speed Demon</span>
              </div>
            </div>
          </div>
        </div>

        <div style="
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          margin-top: 24px;
          text-align: center;
        ">
          <h3 style="margin: 0 0 16px 0; color: #1f2937;">Account Settings</h3>
          <div style="
            display: flex;
            gap: 16px;
            justify-content: center;
            flex-wrap: wrap;
          ">
            <button style="
              background: #6366f1;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            ">Edit Profile</button>
            <button style="
              background: #f59e0b;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            ">Change Password</button>
            <button onclick="window.location.hash = '/'" style="
              background: #ef4444;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            ">Logout</button>
          </div>
        </div>
      </div>
    `;
  }
}