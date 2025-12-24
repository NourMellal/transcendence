/* eslint-disable no-console */
/**
 * 1v1 game bot CLI.
 *
 * Usage:
 *   npx ts-node tools/game-bot.ts --game <id> --count 1 --api-url http://api-gateway:3000/api
 *
 * Notes:
 * - Uses native fetch (Node 18+).
 * - Connects to the game Socket.IO gateway and sends ready/paddle input.
 */

import { io, Socket } from 'socket.io-client';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
};

type CliOptions = {
  gameId: string;
  count: number;
  apiUrl: string;
  ws: boolean;
};

type SocketConfig = {
  origin: string;
  path: string;
};

type JsonResult<T> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
};

const DEFAULT_API_URL = 'http://api-gateway:3000/api';
const DEFAULT_COUNT = 1;
const BOT_PASSWORD = 'Test1234!';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]): CliOptions {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    args[key] = value;
    if (value !== 'true') {
      i += 1;
    }
  }

  const gameId = args.game || '';
  const count = parseInt(args.count || String(DEFAULT_COUNT), 10);
  const apiUrl = args['api-url'] || DEFAULT_API_URL;
  const wsValue = args.ws ?? 'true';
  const ws = !(wsValue === 'false' || wsValue === '0');

  return {
    gameId,
    count: Number.isNaN(count) ? DEFAULT_COUNT : count,
    apiUrl,
    ws,
  };
}

function normalizeApiUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function buildSocketConfig(apiUrl: string): SocketConfig {
  const parsed = new URL(apiUrl);
  const trimmedPath = parsed.pathname.replace(/\/+$/, '');
  const basePath = trimmedPath.endsWith('/api') ? trimmedPath.slice(0, -4) : trimmedPath;
  const origin = `${parsed.protocol}//${parsed.host}${basePath}`;
  const path = `${basePath}/api/games/ws/socket.io`.replace(/\/{2,}/g, '/');
  return { origin, path };
}

async function requestJson<T>(
  url: string,
  options: RequestInit
): Promise<JsonResult<T>> {
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let data: T | undefined;
    try {
      data = text ? (JSON.parse(text) as T) : undefined;
    } catch {
      data = undefined;
    }
    if (!response.ok) {
      const message =
        (data as any)?.message ||
        (data as any)?.error ||
        text ||
        response.statusText ||
        `HTTP ${response.status}`;
      return { ok: false, status: response.status, data, error: message };
    }
    return { ok: true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

class Bot {
  readonly username: string;
  readonly email: string;
  readonly password: string;
  private token?: string;
  private refreshToken?: string;
  private userId?: string;
  private readonly apiBase: string;
  private readonly gameId: string;
  private readonly socketConfig: SocketConfig;
  private readonly wsEnabled: boolean;
  private socket?: Socket;
  private paddleInterval?: NodeJS.Timeout;
  private readyInterval?: NodeJS.Timeout;
  private readyConfirmed = false;
  private refreshInFlight?: Promise<boolean>;

  constructor(index: number, apiBase: string, gameId: string, socketConfig: SocketConfig, ws: boolean) {
    this.username = `bot_${index}`;
    this.email = `bot_${index}@test.local`;
    this.password = BOT_PASSWORD;
    this.apiBase = apiBase;
    this.gameId = gameId;
    this.socketConfig = socketConfig;
    this.wsEnabled = ws;
  }

  private log(message: string): void {
    console.log(`[${this.username}] ${message}`);
  }

  getToken(): string | undefined {
    return this.token;
  }

  async signupOrLogin(): Promise<void> {
    const signupPayload = {
      username: this.username,
      email: this.email,
      password: this.password,
    };

    const signupResponse = await requestJson(
      `${this.apiBase}/auth/signup`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupPayload),
      }
    );

    if (signupResponse.ok) {
      this.log('Signed up.');
      await this.login();
      return;
    }

    if (signupResponse.status === 409 || signupResponse.status === 400) {
      await this.login();
      return;
    }

    throw new Error(`Signup failed: ${signupResponse.error ?? 'unknown error'}`);
  }

  private async login(): Promise<void> {
    const loginResponse = await requestJson<LoginResponse>(
      `${this.apiBase}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email,
          password: this.password,
        }),
      }
    );

    if (!loginResponse.ok || !loginResponse.data) {
      throw new Error(`Login failed: ${loginResponse.error ?? 'unknown error'}`);
    }

    this.token = loginResponse.data.accessToken;
    this.refreshToken = loginResponse.data.refreshToken;
    this.userId = loginResponse.data.user?.id;
    this.log('Logged in.');
  }

  async joinGame(): Promise<boolean> {
    const joinResponse = await this.requestAuth(
      `${this.apiBase}/games/${this.gameId}/join`,
      { method: 'POST' }
    );

    if (joinResponse.ok) {
      this.log(`OK joined game ${this.gameId}`);
      return true;
    }

    this.log(`FAIL join game: ${joinResponse.error ?? 'unknown error'}`);
    return false;
  }

  async readyUp(): Promise<boolean> {
    const readyResponse = await this.requestAuth(
      `${this.apiBase}/games/${this.gameId}/ready`,
      { method: 'POST' }
    );

    if (readyResponse.ok) {
      this.readyConfirmed = true;
      this.log('OK ready up');
      return true;
    }

    this.log(`FAIL ready up: ${readyResponse.error ?? 'unknown error'}`);
    return false;
  }

  connectToGame(): void {
    if (!this.wsEnabled || !this.token || this.socket) return;

    const socket = io(this.socketConfig.origin, {
      path: this.socketConfig.path,
      transports: ['websocket'],
      query: { token: this.token },
      reconnection: false,
    });

    this.socket = socket;

    const sendReady = () => {
      if (this.readyConfirmed) return;
      socket.emit('ready', { gameId: this.gameId });
    };

    const startReadyRetries = () => {
      if (this.readyConfirmed || this.readyInterval) return;
      this.readyInterval = setInterval(() => {
        sendReady();
      }, 2000);
    };

    socket.on('connect', () => {
      this.log(`WS connected for ${this.gameId}`);
      socket.emit('join_game', { gameId: this.gameId });
      setTimeout(sendReady, 300);
      startReadyRetries();

      this.paddleInterval = setInterval(() => {
        const y = Math.floor(50 + Math.random() * 300);
        socket.emit('paddle_set', { gameId: this.gameId, y });
      }, 2000);
    });

    socket.on('player_ready', (payload: { playerId?: string }) => {
      if (payload?.playerId && payload.playerId === this.userId) {
        this.readyConfirmed = true;
        this.stopReadyRetries();
      }
    });

    socket.on('game_state', (payload: { status?: string }) => {
      if (payload?.status === 'IN_PROGRESS' || payload?.status === 'PLAYING') {
        this.readyConfirmed = true;
        this.stopReadyRetries();
      }
      if (payload?.status === 'FINISHED' || payload?.status === 'CANCELLED') {
        this.log(`Game ${this.gameId} finished.`);
        this.disconnect();
      }
    });

    socket.on('error', (payload: { message?: string }) => {
      if (payload?.message) {
        this.log(`WS error: ${payload.message}`);
        this.handleAuthError(payload.message, 'error');
      }
    });

    socket.on('connect_error', (err) => {
      this.log(`WS connect error: ${err.message}`);
      this.handleAuthError(err.message, 'connect_error');
    });

    socket.on('disconnect', () => {
      this.disconnect();
    });
  }

  private stopReadyRetries(): void {
    if (this.readyInterval) {
      clearInterval(this.readyInterval);
      this.readyInterval = undefined;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
    if (this.paddleInterval) {
      clearInterval(this.paddleInterval);
      this.paddleInterval = undefined;
    }
    this.stopReadyRetries();
  }

  async requestAuth<T>(url: string, options: RequestInit, retry = true): Promise<JsonResult<T>> {
    if (!this.token) {
      return { ok: false, status: 0, error: 'Missing auth token' };
    }

    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${this.token}`,
    };

    const response = await requestJson<T>(url, { ...options, headers });
    if (response.status === 401 && retry) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        return this.requestAuth<T>(url, options, false);
      }
    }

    return response;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = (async () => {
      if (!this.refreshToken) {
        this.log('No refresh token available; cannot refresh access token.');
        return false;
      }

      const refreshResponse = await requestJson<LoginResponse>(
        `${this.apiBase}/auth/refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        }
      );

      if (!refreshResponse.ok || !refreshResponse.data) {
        this.log(`Refresh token failed: ${refreshResponse.error ?? 'unknown error'}`);
        return false;
      }

      this.token = refreshResponse.data.accessToken;
      this.refreshToken = refreshResponse.data.refreshToken || this.refreshToken;
      this.userId = refreshResponse.data.user?.id ?? this.userId;
      this.log('Refreshed access token.');
      return true;
    })();

    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = undefined;
    }
  }

  private handleAuthError(message: string, source: string): void {
    if (!/unauthorized|expired|jwt/i.test(message)) {
      return;
    }

    void (async () => {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) return;
      this.log(`Reconnecting WS after token refresh (${source})`);
      this.disconnect();
      await sleep(250);
      this.connectToGame();
    })();
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!options.gameId) {
    console.error('Usage: --game <id> [--count 1] [--api-url http://api-gateway:3000/api] [--ws false]');
    process.exit(1);
  }

  const apiBase = normalizeApiUrl(options.apiUrl);
  const socketConfig = buildSocketConfig(apiBase);

  const bots: Bot[] = [];
  for (let i = 1; i <= options.count; i += 1) {
    bots.push(new Bot(i, apiBase, options.gameId, socketConfig, options.ws));
  }

  for (const bot of bots) {
    try {
      await bot.signupOrLogin();
      const joined = await bot.joinGame();
      if (joined) {
        await sleep(200);
        await bot.readyUp();
        bot.connectToGame();
      }
    } catch (error) {
      console.log(`FAIL ${bot.username}: ${(error as Error).message}`);
    }
    await sleep(300);
  }

  console.log('All bots processed. You can now use the UI to observe the 1v1 game.');

  const heartbeat = setInterval(() => {
    console.log('Bots still running...');
  }, 30000);

  const shutdown = () => {
    clearInterval(heartbeat);
    bots.forEach((bot) => bot.disconnect());
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(`Fatal error: ${(error as Error).message}`);
  process.exit(1);
});
