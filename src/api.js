// Same behaviour as js/api.js, plus token helpers shared by login / logout.

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8088/api';

function readStorage(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function getToken() {
  return (
    readStorage(localStorage, 'token') ||
    readStorage(sessionStorage, 'token') ||
    readStorage(localStorage, 'erp_token') ||
    readStorage(sessionStorage, 'erp_token')
  );
}

export function clearToken() {
  ['token', 'erp_token', 'erp_user_id', 'erp_user_name', 'erp_user_email'].forEach((key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  });
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function authFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...authHeaders(),
    },
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
  }

  return response;
}

// Spring may return a Page<> ({content: [...]}) or a plain array.
export const unwrap = (data) => data?.content ?? data;