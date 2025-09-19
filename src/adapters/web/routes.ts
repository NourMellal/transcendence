import { FastifyInstance } from 'fastify';
import { AuthController } from './controllers/auth.controller';
import { UsersController } from './controllers/users.controller';

export function registerRoutes(app: FastifyInstance, authController: AuthController, usersController: UsersController) {
  // Auth routes
  app.get('/auth/42', authController.start42Login.bind(authController));
  app.get('/auth/42/callback', authController.handle42Callback.bind(authController));

  // User routes
  app.get('/users/me', usersController.getMe.bind(usersController));
  app.put('/users/me', usersController.updateProfile.bind(usersController));
  app.post('/users/me/2fa/generate', usersController.generate2FA.bind(usersController));
  app.post('/users/me/2fa/enable', usersController.enable2FA.bind(usersController));
}
