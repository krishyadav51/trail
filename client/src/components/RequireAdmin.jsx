import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ADMIN_TOKEN_KEY = 'tos_admin_token';

const getTokenPayload = (token) => {
  try {
    const payloadPart = token.split('.')[1];
    return JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
};

const isTokenValid = (token) => {
  if (!token) return false;
  const payload = getTokenPayload(token);
  if (!payload?.exp) return false;
  // exp is in seconds
  return payload.exp * 1000 > Date.now();
};

/**
 * RequireAdmin — guards admin routes.
 * Missing or expired session → silent redirect to the admin login page.
 */
export default function RequireAdmin({ children }) {
  const location = useLocation();
  const [token, setToken] = useState(localStorage.getItem(ADMIN_TOKEN_KEY));

  // Re-check whenever the tab regains focus (covers expiry while idle)
  useEffect(() => {
    const check = () => setToken(localStorage.getItem(ADMIN_TOKEN_KEY));
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, []);

  if (!isTokenValid(token)) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    return (
      <Navigate
        to={`/admin/login?expired=${token ? '1' : '0'}`}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return children;
}
