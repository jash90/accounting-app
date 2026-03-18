/**
 * Get WebSocket base URL for Socket.IO connections.
 *
 * WebSockets CANNOT go through Vercel rewrites (serverless, no persistent connections).
 * The client must connect directly to the Railway API server.
 *
 * Priority: VITE_API_URL (build-time) > runtime config > empty (dev proxy)
 */
export const getWsBaseUrl = (): string => {
  // Build-time env var — set in Vercel dashboard as VITE_API_URL
  const buildTimeUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (buildTimeUrl) {
    return buildTimeUrl;
  }

  // Runtime config fallback (injected via script tag / sed)
  if (typeof window !== 'undefined') {
    const wsUrl = window.__APP_CONFIG__?.WS_URL;
    if (wsUrl && wsUrl !== '__WS_URL__') {
      return wsUrl;
    }
    const apiUrl = window.__APP_CONFIG__?.API_BASE_URL;
    if (apiUrl && apiUrl !== '__API_BASE_URL__') {
      return apiUrl;
    }
  }

  // DEV mode: empty string → Vite proxy handles it
  return '';
};
