import { User } from './entity';

export interface UserRepo {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  update(id: string, updates: Partial<User>): Promise<void>;
}

export interface SessionStore {
  get(sessionId: string): Promise<User | null>;
  set(sessionId: string, user: User): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

export interface TwoFAService {
  generateSecret(): string;
  generateQRCode(secret: string, username: string): Promise<string>;
  verifyToken(secret: string, token: string): boolean;
}

export interface ImageStore {
  save(image: Buffer, filename: string): Promise<string>;
  delete(path: string): Promise<void>;
}
