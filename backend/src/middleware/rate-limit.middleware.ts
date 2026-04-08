import type { NextFunction, Request, Response } from 'express';

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  message: string;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

function createRateLimiter({
  maxRequests,
  windowMs,
  message,
  keyGenerator,
}: RateLimitOptions) {
  const requests = new Map<string, RateLimitState>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator?.(req) || req.ip || 'unknown';
    const currentTime = Date.now();
    const currentState = requests.get(key);

    if (!currentState || currentState.resetAt <= currentTime) {
      requests.set(key, {
        count: 1,
        resetAt: currentTime + windowMs,
      });
      return next();
    }

    if (currentState.count >= maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((currentState.resetAt - currentTime) / 1000),
      );

      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        error: message,
        retry_after_seconds: retryAfterSeconds,
      });
    }

    currentState.count += 1;
    requests.set(key, currentState);
    next();
  };
}

export const generalApiRateLimiter = createRateLimiter({
  maxRequests: 300,
  windowMs: 5 * 60 * 1000,
  message: 'Too many API requests. Please slow down and try again shortly.',
});

export const authLoginRateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
  message: 'Too many login attempts. Please wait before trying again.',
  keyGenerator: (req) => {
    const email =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'unknown';
    return `${req.ip || 'unknown'}:${email}`;
  },
});

export const publicPaymentRateLimiter = createRateLimiter({
  maxRequests: 60,
  windowMs: 5 * 60 * 1000,
  message: 'Too many payment-link requests. Please try again in a few minutes.',
});

export const webhookRateLimiter = createRateLimiter({
  maxRequests: 120,
  windowMs: 60 * 1000,
  message: 'Too many webhook requests. Please try again shortly.',
});
