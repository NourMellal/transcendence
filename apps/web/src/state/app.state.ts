import { authManager } from '@/utils/auth';

type SignalListener<T> = (value: T) => void;

class Signal<T> {
  private listeners = new Set<SignalListener<T>>();

  constructor(private value: T) {}

  subscribe(listener: SignalListener<T>): () => void {
    this.listeners.add(listener);
    listener(this.value);
    return () => {
      this.listeners.delete(listener);
    };
  }

  set(value: T): void {
    this.value = value;
    this.listeners.forEach((listener) => listener(value));
  }

  get snapshot(): T {
    return this.value;
  }
}

const storage = typeof window !== 'undefined' ? window.localStorage : null;

export interface AuthSignalState {
  token: string | null;
  userId: string | null;
  isAuthenticated: boolean;
}

const initialAuthState = authManager.getState();
const authSignal = new Signal<AuthSignalState>({
  token: storage?.getItem('auth_token') ?? null,
  userId: initialAuthState.user?.id ?? null,
  isAuthenticated: initialAuthState.isAuthenticated,
});

authManager.subscribe((state) => {
  authSignal.set({
    token: storage?.getItem('auth_token') ?? null,
    userId: state.user?.id ?? null,
    isAuthenticated: state.isAuthenticated,
  });
});

export const appState = {
  auth: authSignal,
};
