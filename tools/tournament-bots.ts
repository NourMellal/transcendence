/* eslint-disable no-console */
/**
 * Tournament bots CLI.
 *
 * Usage:
 *   npx ts-node tools/tournament-bots.ts --tournament <id> --count 7 --api-url http://api-gateway:3000/api --passcode <code>
 *
 * Dependencies (if needed):
 *   pnpm add -D ts-node socket.io-client
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

type TournamentMatchPlayer = {
  userId: string;
  username?: string;
};

type TournamentMatch = {
  id: string;
  round: number;
  matchPosition: number;
  status: 'pending' | 'in_progress' | 'finished';
  player1?: TournamentMatchPlayer | null;
  player2?: TournamentMatchPlayer | null;
  gameId?: string | null;
};

type TournamentDetail = {
  id: string;
  status: 'recruiting' | 'in_progress' | 'finished';
  participants?: Array<{ userId: string }>;
  currentParticipants?: number;
  matches?: TournamentMatch[];
};

type CliOptions = {
  tournamentId: string;
  count: number;
  apiUrl: string;
  passcode?: string;
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
const DEFAULT_COUNT = 7;
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

  const tournamentId = args.tournament || '';
  const count = parseInt(args.count || String(DEFAULT_COUNT), 10);
  const apiUrl = args['api-url'] || DEFAULT_API_URL;
  const passcode = args.passcode;

  return {
    tournamentId,
    count: Number.isNaN(count) ? DEFAULT_COUNT : count,
    apiUrl,
    passcode,
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
  private readonly tournamentId: string;
  private readonly passcode?: string;
  private readonly socketConfig: SocketConfig;
  private gameSockets = new Map<string, Socket>();
  private paddleIntervals = new Map<string, NodeJS.Timeout>();
  private readyIntervals = new Map<string, NodeJS.Timeout>();
  private readyAttempts = new Map<string, number>();
  private readyConfirmed = new Set<string>();
  private refreshInFlight?: Promise<boolean>;

  constructor(
    index: number,
    apiBase: string,
    tournamentId: string,
    socketConfig: SocketConfig,
    passcode?: string
  ) {
    this.username = `bot_${index}`;
    this.email = `bot_${index}@test.local`;
    this.password = BOT_PASSWORD;
    this.apiBase = apiBase;
    this.tournamentId = tournamentId;
    this.socketConfig = socketConfig;
    this.passcode = passcode;
  }

  getId(): string | undefined {
    return this.userId;
  }

  getToken(): string | undefined {
    return this.token;
  }

  private log(message: string): void {
    console.log(`[${this.username}] ${message}`);
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

  async joinTournament(): Promise<boolean> {
    const url = new URL(`${this.apiBase}/tournaments/${this.tournamentId}/join`);
    if (this.passcode) {
      url.searchParams.set('passcode', this.passcode);
    }

    const joinResponse = await this.requestAuth(
      url.toString(),
      { method: 'POST' }
    );

    if (joinResponse.ok) {
      console.log(`✅ ${this.username} joined tournament`);
      return true;
    }

    console.log(`❌ ${this.username} join failed: ${joinResponse.error ?? 'unknown error'}`);
    return false;
  }

  async maybeStartMatch(
    match: TournamentMatch,
    playAttempts: Map<string, number>
  ): Promise<void> {
    if (!this.token || !this.userId) return;
    if (match.status !== 'pending') return;
    if (!match.player1 || !match.player2) return;
    if (match.gameId) return;

    const isParticipant =
      match.player1.userId === this.userId || match.player2.userId === this.userId;
    if (!isParticipant) return;

    const now = Date.now();
    const lastAttempt = playAttempts.get(match.id);
    if (lastAttempt && now - lastAttempt < 15000) {
      return;
    }
    playAttempts.set(match.id, now);

    const playResponse = await this.requestAuth<{ gameId: string; redirectUrl: string }>(
      `${this.apiBase}/tournaments/${this.tournamentId}/matches/${match.id}/play`,
      { method: 'POST' }
    );

    if (!playResponse.ok || !playResponse.data) {
      this.log(`Play match failed (${match.id}): ${playResponse.error ?? 'unknown error'}`);
      return;
    }

    this.log(`Started match ${match.id} -> game ${playResponse.data.gameId}`);
    await this.connectToGame(playResponse.data.gameId);
  }

  async connectToGame(gameId: string): Promise<void> {
    if (!this.token || this.gameSockets.has(gameId)) return;

    const socket = io(this.socketConfig.origin, {
      path: this.socketConfig.path,
      transports: ['websocket'],
      query: { token: this.token },
      reconnection: false,
    });

    this.gameSockets.set(gameId, socket);

    const sendReady = () => {
      if (this.readyConfirmed.has(gameId)) {
        return;
      }
      socket.emit('ready', { gameId });
      const attempts = (this.readyAttempts.get(gameId) ?? 0) + 1;
      this.readyAttempts.set(gameId, attempts);
      if (attempts === 1) {
        this.log(`Sent ready for ${gameId}`);
      }
    };

    const startReadyRetries = () => {
      if (this.readyConfirmed.has(gameId)) return;
      if (this.readyIntervals.has(gameId)) return;
      const interval = setInterval(() => {
        sendReady();
      }, 2000);
      this.readyIntervals.set(gameId, interval);
    };

    socket.on('connect', () => {
      this.log(`Connected to game WS for ${gameId}`);
      socket.emit('join_game', { gameId });
      setTimeout(sendReady, 300);
      startReadyRetries();

      const interval = setInterval(() => {
        const y = Math.floor(50 + Math.random() * 300);
        socket.emit('paddle_set', { gameId, y });
      }, 2000);
      this.paddleIntervals.set(gameId, interval);
    });

    socket.on('game_state', (payload: { status?: string }) => {
      if (payload?.status === 'WAITING') {
        startReadyRetries();
      }
      if (payload?.status === 'PLAYING' || payload?.status === 'IN_PROGRESS') {
        this.readyConfirmed.add(gameId);
        this.stopReadyRetries(gameId);
      }
      if (payload?.status === 'FINISHED' || payload?.status === 'CANCELLED') {
        this.log(`Game ${gameId} finished.`);
        this.disconnectGame(gameId);
      }
    });

    socket.on('player_ready', (payload: { playerId?: string }) => {
      if (payload?.playerId && payload.playerId === this.userId) {
        this.readyConfirmed.add(gameId);
        this.stopReadyRetries(gameId);
      }
    });

    socket.on('game_start', () => {
      this.readyConfirmed.add(gameId);
      this.stopReadyRetries(gameId);
    });

    socket.on('error', (payload: { message?: string }) => {
      if (payload?.message) {
        this.log(`Game WS error for ${gameId}: ${payload.message}`);
        this.handleAuthError(gameId, payload.message, 'error');
      }
    });

    socket.on('connect_error', (err) => {
      this.log(`Game WS error for ${gameId}: ${err.message}`);
      this.handleAuthError(gameId, err.message, 'connect_error');
    });

    socket.on('disconnect', () => {
      this.disconnectGame(gameId);
    });
  }

  disconnectGame(gameId: string): void {
    const socket = this.gameSockets.get(gameId);
    if (socket) {
      socket.disconnect();
      this.gameSockets.delete(gameId);
    }
    const interval = this.paddleIntervals.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.paddleIntervals.delete(gameId);
    }
    this.stopReadyRetries(gameId);
    this.readyConfirmed.delete(gameId);
  }

  private stopReadyRetries(gameId: string): void {
    const interval = this.readyIntervals.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.readyIntervals.delete(gameId);
    }
    this.readyAttempts.delete(gameId);
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

  private handleAuthError(gameId: string, message: string, source: string): void {
    if (!this.isAuthError(message)) {
      return;
    }

    void (async () => {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) return;
      this.log(`Reconnecting game WS for ${gameId} after token refresh (${source})`);
      this.disconnectGame(gameId);
      await sleep(250);
      await this.connectToGame(gameId);
    })();
  }

  private isAuthError(message: string): boolean {
    return /unauthorized|expired|jwt/i.test(message);
  }

  shutdown(): void {
    for (const gameId of this.gameSockets.keys()) {
      this.disconnectGame(gameId);
    }
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!options.tournamentId) {
    console.error(
      'Usage: --tournament <id> [--count 7] [--api-url http://api-gateway:3000/api] [--passcode <code>]'
    );
    process.exit(1);
  }

  const apiBase = normalizeApiUrl(options.apiUrl);
  const socketConfig = buildSocketConfig(apiBase);
  const bots: Bot[] = [];
  const botsByUserId = new Map<string, Bot>();

  for (let i = 1; i <= options.count; i += 1) {
    bots.push(new Bot(i, apiBase, options.tournamentId, socketConfig, options.passcode));
  }

  for (const bot of bots) {
    try {
      await bot.signupOrLogin();
      const joined = await bot.joinTournament();
      if (joined && bot.getId()) {
        botsByUserId.set(bot.getId()!, bot);
      }
    } catch (error) {
      console.log(`❌ ${bot.username} failed: ${(error as Error).message}`);
    }
    await sleep(300);
  }

  console.log('All bots processed. You can now use the UI as real user to watch the tournament.');

  const playAttempts = new Map<string, number>();

  const pollTournament = async () => {
    const pollBot = bots.find((bot) => bot.getToken());
    if (!pollBot) return;

    const detailResponse = await pollBot.requestAuth<TournamentDetail>(
      `${apiBase}/tournaments/${options.tournamentId}`,
      { method: 'GET' }
    );

    if (!detailResponse.ok || !detailResponse.data) {
      console.log(`Tournament poll failed: ${detailResponse.error ?? 'unknown error'}`);
      return;
    }

    const detail = detailResponse.data;
    const matches = detail.matches ?? [];
    const counts = matches.reduce(
      (acc, match) => {
        acc[match.status] += 1;
        if (match.gameId) acc.withGameId += 1;
        return acc;
      },
      { pending: 0, in_progress: 0, finished: 0, withGameId: 0 }
    );
    const participantCount =
      detail.participants?.length ?? detail.currentParticipants ?? 0;

    console.log(
      `[Bracket] status=${detail.status} participants=${participantCount} matches(pending=${counts.pending}, in_progress=${counts.in_progress}, finished=${counts.finished}, withGameId=${counts.withGameId})`
    );

    for (const match of matches) {
      const player1 = match.player1?.userId ? botsByUserId.get(match.player1.userId) : undefined;
      const player2 = match.player2?.userId ? botsByUserId.get(match.player2.userId) : undefined;
      const matchBots = [player1, player2].filter((bot): bot is Bot => Boolean(bot));

      if (match.gameId) {
        for (const bot of matchBots) {
          await bot.connectToGame(match.gameId);
        }
        continue;
      }

      if (matchBots.length > 0) {
        await matchBots[0].maybeStartMatch(match, playAttempts);
      }
    }
  };

  const heartbeat = setInterval(() => {
    console.log('Bots still running...');
  }, 30000);

  const poller = setInterval(() => {
    pollTournament().catch((error) => {
      console.log(`Tournament poll error: ${(error as Error).message}`);
    });
  }, 15000);

  const shutdown = () => {
    clearInterval(heartbeat);
    clearInterval(poller);
    bots.forEach((bot) => bot.shutdown());
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(`Fatal error: ${(error as Error).message}`);
  process.exit(1);
});
