const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';
const DEFAULT_SOCKET_URL = 'http://localhost:5000';

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function getConfiguredApiBaseUrl(): string {
  const configuredValue = import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
  return trimTrailingSlashes(configuredValue);
}

function deriveSocketUrl(apiBaseUrl: string): string {
  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();

  if (configuredSocketUrl) {
    return trimTrailingSlashes(configuredSocketUrl);
  }

  try {
    const parsedUrl = new URL(apiBaseUrl);
    const normalizedPath = trimTrailingSlashes(parsedUrl.pathname);

    if (normalizedPath.toLowerCase().endsWith('/api')) {
      parsedUrl.pathname = normalizedPath.slice(0, -4) || '/';
    } else {
      parsedUrl.pathname = normalizedPath || '/';
    }

    parsedUrl.search = '';
    parsedUrl.hash = '';

    return trimTrailingSlashes(parsedUrl.toString());
  } catch {
    return DEFAULT_SOCKET_URL;
  }
}

export const API_BASE_URL = getConfiguredApiBaseUrl();
export const SOCKET_URL = deriveSocketUrl(API_BASE_URL);
