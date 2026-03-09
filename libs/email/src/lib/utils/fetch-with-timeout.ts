/**
 * Fetch with timeout helper
 *
 * Performs a fetch request with an AbortController timeout.
 * Useful for network requests where you want to fail fast if the server is unresponsive.
 *
 * @param url - The URL to fetch
 * @param timeout - Timeout in milliseconds
 * @param options - Optional fetch options (method, headers, body, etc.)
 * @returns Promise resolving to the Response
 * @throws Error if the request times out or fails
 */
export async function fetchWithTimeout(
  url: string,
  timeout: number,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
