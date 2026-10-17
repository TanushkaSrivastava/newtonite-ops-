/**
 * Newtonite Ops Centralized API Client
 * - Manages authorization tokens
 * - Dispatches standard JSON requests
 * - Extracts structured error responses (e.g. 409 Conflict VERSION_CONFLICT, 422 INVALID_TRANSITION)
 * - Attaches Idempotency-Key headers
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  constructor(message, status, code, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code || (status === 409 ? 'VERSION_CONFLICT' : 'API_ERROR');
    this.details = details;
  }
}

export function getAuthToken() {
  return localStorage.getItem('newtonite_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('newtonite_token', token);
  } else {
    localStorage.removeItem('newtonite_token');
  }
}

export function clearSession() {
  localStorage.removeItem('newtonite_token');
  localStorage.removeItem('newtonite_user');
  localStorage.removeItem('newtonite_active_team');
}

export async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    idempotencyKey,
    params,
  } = options;

  let url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params && Object.keys(params).length > 0) {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = getAuthToken();
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    ...headers,
  };

  const fetchOptions = {
    method,
    headers: reqHeaders,
  };

  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (netErr) {
    throw new ApiError(
      'Network request failed. Please check your connection or server status.',
      0,
      'NETWORK_ERROR',
      netErr
    );
  }

  let responseData = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    // 401 Unauthorized handling
    if (response.status === 401) {
      // Don't auto-clear if it was a login attempt failure
      if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        clearSession();
      }
    }

    const errorObj = responseData?.error || {};
    const message =
      errorObj.message ||
      responseData?.message ||
      `Request failed with status ${response.status}`;
    const code = errorObj.code || (response.status === 409 ? 'VERSION_CONFLICT' : null);

    throw new ApiError(message, response.status, code, errorObj.details || responseData);
  }

  return responseData;
}
