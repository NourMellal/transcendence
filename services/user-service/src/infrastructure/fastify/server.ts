import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { UserController } from '../../adapters/controllers/user.controller';
import { GetMeUseCaseImpl } from '../../core/use-cases/get-me.use-case';

// Load environment variables
config();

// Mock implementations for dependencies (replace with real implementations)
const sessionStore = {
  get: async (sessionId: string) => ({ id: '1', email: 'user@example.com', username: 'testuser', isTwoFAEnabled: false, createdAt: new Date(), updatedAt: new Date() }),
  set: async () => {},
  delete: async () => {},
};

const userRepository = {
  findById: async (id: string) => ({ id, email: 'user@example.com', username: 'testuser', isTwoFAEnabled: false, createdAt: new Date(), updatedAt: new Date() }),
  findByEmail: async () => null,
  save: async () => {},
  update: async () => {},
};

// Initialize use cases
const getMeUseCase = new GetMeUseCaseImpl(sessionStore, userRepository);

// Initialize controllers
const userController = new UserController(getMeUseCase);

// Create Fastify instance
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register plugins
app.register(cookie);
app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});

// Register routes
app.get('/health', async () => {
  return { status: 'ok', service: 'user-service', timestamp: new Date().toISOString() };
});

app.get('/users/me', userController.getMe.bind(userController));

// Start the server
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    console.log(`User service is running on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
