const TOKEN_KEY = 'mindforge_access_token';
const AUTH_CHANGED_EVENT = 'mindforge-auth-changed';

/** 登录身份变化时刷新依赖身份的组件和缓存，包括其他浏览器标签页。 */
export function subscribeAuthChanges(listener: () => void): () => void {
  const onStorageChange = (event: StorageEvent) => {
    if (event.key === TOKEN_KEY || event.key === null) listener();
  };
  window.addEventListener(AUTH_CHANGED_EVENT, listener);
  window.addEventListener('storage', onStorageChange);
  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, listener);
    window.removeEventListener('storage', onStorageChange);
  };
}

/**
 * 获取token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

/**
 * 勾选“记住我”时存 localStorage，关闭浏览器后仍保留。
 * 未勾选时存 sessionStorage，关闭浏览器标签页/窗口后失效。
 *
 * @param token token
 * @param remember 记住我标识
 */
export function saveAccessToken(token: string, remember: boolean) {
  // 避免两个存储位置同时残留旧 token
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);

  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

/**
 * 清理token
 */
export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
