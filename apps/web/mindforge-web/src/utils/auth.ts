const TOKEN_KEY = 'mindforge_access_token';

/**
 * 获取token
 */
export function getAccessToken(): string | null {
  return (
    localStorage.getItem(TOKEN_KEY) ??
    sessionStorage.getItem(TOKEN_KEY)
  );
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
}

/**
 * 清理token
 */
export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
