import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { env } from './config';
import { registerRoutes } from './interface/http/routes';
import { AuthController } from './interface/http/controllers/auth.controller';
import { UsersController } from './interface/http/controllers/users.controller';
import {
  getMeUseCase,
  updateProfileUseCase,
  generate2FAUseCase,
  enable2FAUseCase,
  start42LoginUseCase,
  handle42CallbackUseCase
} from './app';

const app = Fastify();

app.register(cookie);

const authController = new AuthController(start42LoginUseCase, handle42CallbackUseCase);
const usersController = new UsersController(
  getMeUseCase,
  updateProfileUseCase,
  generate2FAUseCase,
  enable2FAUseCase
);

registerRoutes(app, authController, usersController);

app.listen({ port: env.PORT }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
