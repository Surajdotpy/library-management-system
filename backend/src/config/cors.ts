import './load-env.ts';
import type { CorsOptions } from 'cors';

const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3000';

function normalizeOrigin(value: string): string | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue.replace(/\/+$/, '');
}

function parseAllowedOrigins(): Set<string> {
  const allowedOrigins = new Set<string>();
  const configuredOrigins = [
    process.env.FRONTEND_URL || DEFAULT_FRONTEND_ORIGIN,
    ...(process.env.ALLOWED_ORIGINS?.split(',') ?? []),
  ];

  for (const configuredOrigin of configuredOrigins) {
    const normalizedOrigin = normalizeOrigin(configuredOrigin);

    if (normalizedOrigin) {
      allowedOrigins.add(normalizedOrigin);
    }
  }

  return allowedOrigins;
}

const allowedOrigins = parseAllowedOrigins();
const allowDesktopAppOrigin =
  (process.env.ALLOW_DESKTOP_APP_ORIGIN || 'true').trim().toLowerCase() !== 'false';

function isDesktopAppOrigin(origin: string): boolean {
  return origin === 'null' || origin.startsWith('file://');
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);

  if (!normalizedOrigin) {
    return true;
  }

  if (allowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  return allowDesktopAppOrigin && isDesktopAppOrigin(origin);
}

function handleCorsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
): void {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origin "${origin}" is not allowed by CORS`));
}

export const corsOptions: CorsOptions = {
  origin: handleCorsOrigin,
  credentials: true,
};

export const socketCorsOptions = {
  origin: handleCorsOrigin,
  credentials: true,
};

export function getAllowedOriginsSummary(): string[] {
  const summary = [...allowedOrigins];

  if (allowDesktopAppOrigin) {
    summary.push('null (Electron desktop app)');
  }

  return summary;
}
