import { getToken } from './api.js';

function read(key) {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(payload))));
  } catch {
    return {};
  }
}

const prettyRole = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const text = typeof raw === 'object' && raw ? raw.authority : raw;
  if (!text) return '';
  const clean = String(text).replace(/^ROLE_/, '');
  return clean.charAt(0) + clean.slice(1).toLowerCase();
};

// Who is signed in: values saved by the login page, with the JWT as a fallback.
// Returns null when nobody is signed in.
export function getCurrentUser() {
  const token = getToken();
  const storedName = read('erp_user_name');
  const storedEmail = read('erp_user_email');
  if (!token && !storedName && !storedEmail) return null;

  const claims = token ? decodeJwt(token) : {};
  const email = storedEmail || claims.email || (String(claims.sub || '').includes('@') ? claims.sub : '');
  const name = storedName || claims.name || (email ? email.split('@')[0] : 'Signed in');
  const role = prettyRole(claims.role ?? claims.roles ?? claims.authorities);

  return { name, email, role };
}

export function getRole() {
  const token = getToken();
  if (!token) return null;
  return decodeJwt(token).role || 'USER';
}