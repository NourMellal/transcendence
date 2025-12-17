import type { Ball, Paddle } from '../types/game.types';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  clear(): void {
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg-dark').trim() || '#000';
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = this.canvas.width / dpr;
    const logicalHeight = this.canvas.height / dpr;
    this.drawRect(0, 0, logicalWidth, logicalHeight, bgColor);
  }

  drawRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  drawCircle(x: number, y: number, r: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2, false);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawText(text: string, x: number, y: number, color: string, font: string = '40px "Press Start 2P"'): void {
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, y);
  }

  drawBorders(): void {
    const dpr = window.devicePixelRatio || 1;
    const logicalHeight = this.canvas.height / dpr;
    const logicalWidth = this.canvas.width / dpr;

    // Clean subtle borders instead of harsh gradients
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.fillRect(0, 0, logicalWidth, 2);
    this.ctx.fillRect(0, logicalHeight - 2, logicalWidth, 2);
  }

  drawNet(): void {
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = this.canvas.width / dpr;
    const logicalHeight = this.canvas.height / dpr;
    this.ctx.setLineDash([15, 15]);
    const panelBorder = getComputedStyle(document.documentElement).getPropertyValue('--color-panel-border').trim() || 'rgba(255, 255, 255, 0.2)';
    this.ctx.strokeStyle = panelBorder;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(logicalWidth / 2, 30);
    this.ctx.lineTo(logicalWidth / 2, logicalHeight - 30);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  drawPaddle(paddle: Paddle, isLeftPaddle: boolean = true): void {
    const color = isLeftPaddle 
      ? getComputedStyle(document.documentElement).getPropertyValue('--color-brand-secondary').trim() || '#ffcc66'
      : getComputedStyle(document.documentElement).getPropertyValue('--color-brand-accent').trim() || '#ff8800';

    this.ctx.fillStyle = color;
    this.ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  }

  drawBall(ball: Ball): void {
    const root = getComputedStyle(document.documentElement);
    const primaryColor = root.getPropertyValue('--color-primary').trim() || '#ffaa44';
    const ballColor = root.getPropertyValue('--color-text-primary').trim() || '#ffffff';

    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = primaryColor;

    this.ctx.fillStyle = ballColor;
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
  }

  drawScore(player1Score: number, player2Score: number): void {
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = this.canvas.width / dpr;

    // Clean white scores with subtle styling
    const scoreColor = '#ffffff';
    const labelColor = 'rgba(255, 255, 255, 0.4)';

    // Small label at top
    this.drawText('SCORE', logicalWidth / 2, 35, labelColor, '14px "Press Start 2P"');

    // Large clean scores
    this.drawText(player1Score.toString(), logicalWidth / 4, 85, scoreColor, '42px "Press Start 2P"');
    this.drawText('-', logicalWidth / 2, 85, labelColor, '28px "Press Start 2P"');
    this.drawText(player2Score.toString(), (logicalWidth * 3) / 4, 85, scoreColor, '42px "Press Start 2P"');
  }

  render(ball: Ball, player1: Paddle, player2: Paddle): void {
    this.clear();
    this.drawBorders();
    this.drawNet();
    this.drawPaddle(player1, true);
    this.drawPaddle(player2, false);
    this.drawBall(ball);
    this.drawScore(player1.score, player2.score);
  }
}