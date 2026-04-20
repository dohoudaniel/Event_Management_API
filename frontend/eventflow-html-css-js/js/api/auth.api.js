/* ============================================================
   auth.api.js - Auth requests wired to the Django backend
   ============================================================ */

(function (global) {
  const client = global.EventFlowApiClient;
  const storage = global.EventFlowStorage;

  function ensureDependencies() {
    if (!client) {
      throw new Error('EventFlowApiClient is required before auth.api.js.');
    }
    if (!storage) {
      throw new Error('EventFlowStorage is required before auth.api.js.');
    }
  }

  function splitFullName(name) {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) {
      return { firstName: '', lastName: '' };
    }

    if (parts.length === 1) {
      return { firstName: parts[0], lastName: parts[0] };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

  function normalizeRegisterPayload(payload = {}) {
    const fallbackName = splitFullName(payload.fullName || payload.name);

    return {
      username: String(payload.username || '').trim(),
      email: String(payload.email || '').trim(),
      first_name: String(
        payload.first_name || payload.firstName || fallbackName.firstName
      ).trim(),
      last_name: String(
        payload.last_name || payload.lastName || fallbackName.lastName
      ).trim(),
      password: payload.password || '',
      password2: payload.password2 || payload.confirmPassword || payload.confirm || '',
      role: payload.role || 'attendee',
    };
  }

  function getSession() {
    return {
      accessToken: storage.getAccessToken(),
      refreshToken: storage.getRefreshToken(),
      isLoggedIn: storage.hasSession(),
    };
  }

  function saveSessionFromLoginResponse(payload) {
    if (payload?.access && payload?.refresh) {
      storage.saveTokens(payload.access, payload.refresh);
    }
    return payload;
  }

  function saveSessionFromRegisterResponse(payload) {
    if (payload?.tokens?.access && payload?.tokens?.refresh) {
      storage.saveTokens(payload.tokens.access, payload.tokens.refresh);
    }
    return payload;
  }

  async function login(payload = {}) {
    ensureDependencies();

    const email = String(payload.email || '').trim();
    const password = payload.password || '';

    return saveSessionFromLoginResponse(
      await client.post('/api/users/token/', { email, password })
    );
  }

  async function register(payload = {}) {
    ensureDependencies();

    return saveSessionFromRegisterResponse(
      await client.post('/api/users/register/', normalizeRegisterPayload(payload))
    );
  }

  async function refreshToken(refreshTokenValue) {
    ensureDependencies();

    const refresh = refreshTokenValue || storage.getRefreshToken();
    if (!refresh) return null;

    try {
      const response = await client.post('/api/users/token/refresh/', { refresh });

      if (response?.access) {
        storage.setAccessToken(response.access);
      }
      if (response?.refresh) {
        storage.setRefreshToken(response.refresh);
      }

      return response;
    } catch (error) {
      storage.clearTokens();
      return null;
    }
  }

  async function verifyToken(accessToken) {
    ensureDependencies();

    const token = accessToken || storage.getAccessToken();
    if (!token) return false;

    try {
      await client.post('/api/users/token/verify/', { token });
      return true;
    } catch (error) {
      return false;
    }
  }

  function logout() {
    ensureDependencies();
    storage.clearTokens();
  }

  global.EventFlowAuthApi = {
    getSession,
    login,
    logout,
    refreshToken,
    register,
    verifyToken,
  };
})(window);
