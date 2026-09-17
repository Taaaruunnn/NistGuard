/**
 * Single source of truth for the API origin.
 *
 * Every service builds its URLs from API_BASE -- nothing hardcodes localhost.
 * Frontend and backend deploy as two separate Vercel projects on different
 * domains, so this is the one line to change after the backend is live.
 *
 * Local development talks to the Express server on :5000.
 */
const PRODUCTION_API = 'https://nistguard-api.vercel.app/api';

const isLocalHost =
  typeof window !== 'undefined' &&
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

export const API_BASE = isLocalHost ? 'http://localhost:5000/api' : PRODUCTION_API;

export const apiUrl = (path: string): string =>
  `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
