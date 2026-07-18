const AUTH_KEYS = ['accessToken', 'refreshToken', 'user'] as const;

function hasTokens(storage: Storage): boolean {
  return Boolean(storage.getItem('refreshToken') || storage.getItem('accessToken'));
}

/** Active storage: localStorage when "remember me", sessionStorage otherwise */
export function getAuthStorage(): Storage {
  if (hasTokens(localStorage)) return localStorage;
  if (hasTokens(sessionStorage)) return sessionStorage;
  return localStorage;
}

export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
}

export function getStoredUserJson(): string | null {
  return localStorage.getItem('user') || sessionStorage.getItem('user');
}

export function persistAuth(
  accessToken: string,
  refreshToken: string,
  userJson: string,
  rememberMe: boolean
): void {
  const storage = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;

  for (const key of AUTH_KEYS) {
    other.removeItem(key);
  }

  storage.setItem('accessToken', accessToken);
  storage.setItem('refreshToken', refreshToken);
  storage.setItem('user', userJson);
}

export function updateAccessToken(accessToken: string, refreshToken?: string): void {
  const storage = getAuthStorage();
  storage.setItem('accessToken', accessToken);
  if (refreshToken) {
    storage.setItem('refreshToken', refreshToken);
  }
}

export function updateStoredUser(user: object): void {
  const storage = getAuthStorage();
  storage.setItem('user', JSON.stringify(user));
}

export function clearAuth(): void {
  for (const key of AUTH_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}
