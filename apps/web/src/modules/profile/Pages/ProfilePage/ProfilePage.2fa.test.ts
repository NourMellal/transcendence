import { describe, it, expect, beforeEach } from 'vitest';
import ProfilePage from './ProfilePage';
import { appState } from '@/state';
import type { User } from '@/models/User';
import { setCurrentUser } from '@/mocks/data';

const baseUser: User = {
  id: 'u-1',
  username: 'tester',
  displayName: 'Tester',
  email: 'tester@example.com',
  avatar: undefined,
  isTwoFAEnabled: false,
  status: 'ONLINE',
  oauthProvider: 'local',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function click(el: Element) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function input(el: HTMLInputElement, value: string) {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

async function tick(times = 1) {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

async function waitFor(assertion: () => void, timeoutMs = 1500) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      assertion();
      return;
    } catch (err) {
      if (Date.now() - start > timeoutMs) throw err;
      await tick(1);
    }
  }
}

function mountProfile(user: User) {
  document.body.innerHTML = '';
  const container = document.createElement('div');
  document.body.appendChild(container);

  setCurrentUser(user);
  const current = appState.auth.get();
  appState.auth.set({
    ...current,
    user,
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
  });

  const page = new ProfilePage();
  page.mount(container);

  return { container, page };
}

beforeEach(() => {
  // reset auth state between tests
  appState.auth.set({
    user: null,
    isLoading: false,
    token: '',
    isAuthenticated: false,
    refreshToken: undefined,
    requires2FA: false,
    twoFAPromptVisible: false,
    oauthProvider: null,
    oauthInProgress: false,
  });
});

describe('ProfilePage 2FA button', () => {
  it('enables 2FA then button becomes Disable', async () => {
    const user = { ...baseUser, isTwoFAEnabled: false };
    const { container } = mountProfile(user);

    let toggle = container.querySelector('[data-profile-action="manage-2fa"]') as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    expect(toggle.textContent).toContain('Enable 2FA');

    click(toggle);
    await tick(1);

    const tokenInput = container.querySelector('[data-profile-2fa="token"]') as HTMLInputElement;
    expect(tokenInput).toBeTruthy();

    input(tokenInput, '123456');

    const confirm = container.querySelector('[data-profile-action="confirm-2fa"]') as HTMLButtonElement;
    expect(confirm).toBeTruthy();
    click(confirm);

    await waitFor(() => {
      toggle = container.querySelector('[data-profile-action="manage-2fa"]') as HTMLButtonElement;
      expect(toggle.textContent).toContain('Disable 2FA');
      expect(container.textContent).toContain('Currently enabled');
      expect(container.querySelector('[data-profile-2fa="token"]')).toBeNull();
      expect(container.querySelector('.profile-alert--error')).toBeNull();
    });
  });

  it('disables 2FA then button becomes Enable', async () => {
    const user = { ...baseUser, isTwoFAEnabled: true };
    const { container } = mountProfile(user);

    let toggle = container.querySelector('[data-profile-action="manage-2fa"]') as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    expect(toggle.textContent).toContain('Disable 2FA');

    click(toggle);
    await tick(1);

    const tokenInput = container.querySelector('[data-profile-2fa="token"]') as HTMLInputElement;
    expect(tokenInput).toBeTruthy();

    input(tokenInput, '123456');

    const confirm = container.querySelector('[data-profile-action="confirm-2fa"]') as HTMLButtonElement;
    click(confirm);

    await waitFor(() => {
      toggle = container.querySelector('[data-profile-action="manage-2fa"]') as HTMLButtonElement;
      expect(toggle.textContent).toContain('Enable 2FA');
      expect(container.textContent).toContain('Currently disabled');
      expect(container.querySelector('[data-profile-2fa="token"]')).toBeNull();
      expect(container.querySelector('.profile-alert--error')).toBeNull();
    });
  });
});
