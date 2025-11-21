import Signal from '../core/signal';

export const appState = {
  auth: new Signal<{ user: any | null; isLoading: boolean }>({ user: null, isLoading: false }),
  notifications: new Signal<string[]>([]),
};
export class AuthActions {
  static async login(email: string, password: string) {
    appState.auth.set({ user: null, isLoading: true });
  }
}
