/* ============================================================
   storage.js - Shared browser storage helpers for auth state
   ============================================================ */

(function (global) {
  const ACCESS_TOKEN_KEY = 'access_token';
  const REFRESH_TOKEN_KEY = 'refresh_token';
  const ACCESS_TOKEN_MAX_AGE = 60 * 5;
  const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24;

  function getCookieOptions(maxAgeSeconds) {
    const options = [`Path=/`, `SameSite=Lax`, `Max-Age=${maxAgeSeconds}`];

    if (global.location?.protocol === 'https:') {
      options.push('Secure');
    }

    return options.join('; ');
  }

  function readCookie(name) {
    const prefix = `${name}=`;
    const cookies = document.cookie ? document.cookie.split('; ') : [];

    for (const cookie of cookies) {
      if (cookie.startsWith(prefix)) {
        return decodeURIComponent(cookie.slice(prefix.length));
      }
    }

    return null;
  }

  function writeCookie(name, value, maxAgeSeconds) {
    if (!value) return;

    document.cookie = [
      `${name}=${encodeURIComponent(value)}`,
      getCookieOptions(maxAgeSeconds),
    ].join('; ');
  }

  function clearCookie(name) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }

  function getAccessToken() {
    return readCookie(ACCESS_TOKEN_KEY);
  }

  function getRefreshToken() {
    return readCookie(REFRESH_TOKEN_KEY);
  }

  function setAccessToken(token) {
    if (!token) return;
    writeCookie(ACCESS_TOKEN_KEY, token, ACCESS_TOKEN_MAX_AGE);
  }

  function setRefreshToken(token) {
    if (!token) return;
    writeCookie(REFRESH_TOKEN_KEY, token, REFRESH_TOKEN_MAX_AGE);
  }

  function saveTokens(accessToken, refreshToken) {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
  }

  function clearTokens() {
    clearCookie(ACCESS_TOKEN_KEY);
    clearCookie(REFRESH_TOKEN_KEY);
  }

  function hasSession() {
    return Boolean(getAccessToken());
  }

  global.EventFlowStorage = {
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    getAccessToken,
    getRefreshToken,
    setAccessToken,
    setRefreshToken,
    saveTokens,
    clearTokens,
    hasSession,
  };
})(window);
