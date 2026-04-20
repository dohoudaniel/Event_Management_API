/* ============================================================
   auth.service.js - Auth state and current-user helpers
   ============================================================ */

(function (global) {
  const authApi = global.EventFlowAuthApi;
  const usersApi = global.EventFlowUsersApi;

  let currentUserCache = null;

  function ensureDependencies() {
    if (!authApi) {
      throw new Error('EventFlowAuthApi is required before auth.service.js.');
    }
  }

  function splitFullName(firstName, lastName, fallbackUsername, fallbackEmail) {
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    return fullName || fallbackUsername || fallbackEmail || 'User';
  }

  function normalizeUserProfile(profile = {}) {
    if (!profile || typeof profile !== 'object') {
      return null;
    }

    return {
      id: profile.id ?? null,
      username: profile.username || '',
      email: profile.email || '',
      firstName: profile.first_name || profile.firstName || '',
      lastName: profile.last_name || profile.lastName || '',
      fullName: splitFullName(
        profile.first_name || profile.firstName,
        profile.last_name || profile.lastName,
        profile.username,
        profile.email
      ),
      role: profile.role || 'attendee',
      isOrganizer: String(profile.role || '').toLowerCase() === 'organizer',
      avatar: profile.avatar || profile.avatar_url || null,
      raw: profile,
    };
  }

  function setCurrentUser(profile) {
    currentUserCache = normalizeUserProfile(profile);
    return currentUserCache;
  }

  function clearCurrentUser() {
    currentUserCache = null;
  }

  function isLoggedIn() {
    ensureDependencies();
    return Boolean(authApi.getSession?.().isLoggedIn);
  }

  function getSession() {
    ensureDependencies();
    const session = authApi.getSession?.() || {};

    return {
      accessToken: session.accessToken || null,
      refreshToken: session.refreshToken || null,
      isLoggedIn: Boolean(session.isLoggedIn),
      hasRefreshToken: Boolean(session.refreshToken),
    };
  }

  async function login(credentials = {}) {
    ensureDependencies();
    const response = await authApi.login(credentials);
    clearCurrentUser();
    return response;
  }

  async function register(payload = {}) {
    ensureDependencies();
    const response = await authApi.register(payload);
    clearCurrentUser();
    return response;
  }

  async function refreshSession() {
    ensureDependencies();
    const response = await authApi.refreshToken();

    return {
      accessToken: response?.access || getSession().accessToken,
      refreshToken: response?.refresh || getSession().refreshToken,
      isLoggedIn: Boolean(response?.access || getSession().accessToken),
    };
  }

  async function getCurrentUser(options = {}) {
    ensureDependencies();

    if (!isLoggedIn()) {
      clearCurrentUser();
      return null;
    }

    if (!usersApi?.getProfile) {
      return currentUserCache;
    }

    if (currentUserCache && !options.force) {
      return currentUserCache;
    }

    const profile = await usersApi.getProfile();
    return setCurrentUser(profile);
  }

  async function updateCurrentUser(payload = {}) {
    ensureDependencies();

    if (!usersApi?.updateProfile) {
      throw new Error('EventFlowUsersApi is required to update the current user.');
    }

    const profile = await usersApi.updateProfile(payload);
    return setCurrentUser(profile);
  }

  async function requireCurrentUser() {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('You need to sign in to continue.');
    }

    return user;
  }

  async function isOrganizer() {
    const user = await getCurrentUser();
    return Boolean(user?.isOrganizer);
  }

  function logout() {
    ensureDependencies();
    clearCurrentUser();
    authApi.logout();
  }

  global.EventFlowAuthService = {
    clearCurrentUser,
    getCurrentUser,
    getSession,
    isLoggedIn,
    isOrganizer,
    login,
    logout,
    normalizeUserProfile,
    refreshSession,
    register,
    requireCurrentUser,
    setCurrentUser,
    updateCurrentUser,
  };
})(window);
