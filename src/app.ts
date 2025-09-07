import { SqliteUserRepo } from './adapters/persistence/sqlite/user.repo';
import { SqliteSessionStore } from './adapters/persistence/session.store';
import { OtpTwoFAService } from './adapters/external/twofa-service';
import { LocalImageStore } from './adapters/external/image-store';
import { FortyTwoOAuthClient } from './adapters/external/oauth42-client';
import { GetMeUseCaseImpl } from './application/user/get-me';
import { UpdateProfileUseCaseImpl } from './application/user/update-profile';
import { Generate2FAUseCaseImpl } from './application/user/generate-2fa';
import { Enable2FAUseCaseImpl } from './application/user/enable-2fa';
import { Start42LoginUseCaseImpl } from './application/auth/start-42-login';
import { Handle42CallbackUseCase } from './application/auth/handle-42-callback';
import { env } from './config';

// TODO: Initialize DB
const db = null;

// Adapters
const userRepo = new SqliteUserRepo(db);
const sessionStore = new SqliteSessionStore(db);
const twoFAService = new OtpTwoFAService(null); // TODO: otplib
const imageStore = new LocalImageStore(env.UPLOAD_DIR);
const oauth42Client = new FortyTwoOAuthClient(
  env.FORTY_TWO_CLIENT_ID,
  env.FORTY_TWO_CLIENT_SECRET,
  env.FORTY_TWO_REDIRECT_URI
);

// Use cases
const getMeUseCase = new GetMeUseCaseImpl(userRepo, sessionStore);
const updateProfileUseCase = new UpdateProfileUseCaseImpl(userRepo, sessionStore, imageStore);
const generate2FAUseCase = new Generate2FAUseCaseImpl(userRepo, sessionStore, twoFAService);
const enable2FAUseCase = new Enable2FAUseCaseImpl(userRepo, sessionStore, twoFAService);
const start42LoginUseCase = new Start42LoginUseCaseImpl(env.FORTY_TWO_CLIENT_ID, env.FORTY_TWO_REDIRECT_URI);
const handle42CallbackUseCase = new Handle42CallbackUseCase(userRepo, sessionStore, oauth42Client);

export {
  getMeUseCase,
  updateProfileUseCase,
  generate2FAUseCase,
  enable2FAUseCase,
  start42LoginUseCase,
  handle42CallbackUseCase
};
