/* ============================================================
   client.js - Shared HTTP client for the EventFlow frontend
   ============================================================ */

(function (global) {
  function getApiBase() {
    return global.EventFlowConfig?.API_BASE || global.API_BASE || '';
  }

  function buildUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    return `${getApiBase()}${path}`;
  }

  function formatApiError(payload, fallbackMessage) {
    if (!payload) return fallbackMessage;

    if (typeof payload === 'string') {
      return payload || fallbackMessage;
    }

    if (payload.detail) {
      return payload.detail;
    }

    const entries = Object.entries(payload);
    if (!entries.length) return fallbackMessage;

    return entries
      .map(([field, errors]) => {
        const text = Array.isArray(errors) ? errors.join(' ') : String(errors);
        return `${field}: ${text}`;
      })
      .join(' | ');
  }

  async function parseResponse(response) {
    if (response.status === 204) {
      return true;
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      throw new Error(
        formatApiError(payload, 'Something went wrong. Please try again.')
      );
    }

    return payload;
  }

  async function sendRequest(path, options, authToken) {
    const { method = 'GET', body, headers = {} } = options;

    const finalHeaders = {
      ...headers,
    };

    const finalOptions = {
      method,
      headers: finalHeaders,
    };

    if (authToken) {
      finalHeaders.Authorization = `Bearer ${authToken}`;
    }

    if (body !== undefined) {
      finalHeaders['Content-Type'] = 'application/json';
      finalOptions.body = JSON.stringify(body);
    }

    return fetch(buildUrl(path), finalOptions);
  }

  async function request(path, options = {}) {
    const {
      auth = false,
      token,
    } = options;

    let accessToken = null;
    if (auth) {
      accessToken = token || global.EventFlowStorage?.getAccessToken?.();
    }

    let response = await sendRequest(path, options, accessToken);

    if (auth && response.status === 401 && !token) {
      const refreshed = await global.EventFlowAuthApi?.refreshToken?.();
      const nextAccessToken = refreshed?.access || global.EventFlowStorage?.getAccessToken?.();

      if (nextAccessToken) {
        response = await sendRequest(path, options, nextAccessToken);
      }
    }

    return parseResponse(response);
  }

  function get(path, options = {}) {
    return request(path, { ...options, method: 'GET' });
  }

  function post(path, body, options = {}) {
    return request(path, { ...options, method: 'POST', body });
  }

  function put(path, body, options = {}) {
    return request(path, { ...options, method: 'PUT', body });
  }

  function patch(path, body, options = {}) {
    return request(path, { ...options, method: 'PATCH', body });
  }

  global.EventFlowApiClient = {
    buildUrl,
    formatApiError,
    request,
    get,
    post,
    put,
    patch,
  };
})(window);
