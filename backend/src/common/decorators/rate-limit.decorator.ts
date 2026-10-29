import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  /**
   * Time window in seconds.
   */
  ttlSeconds: number;

  /**
   * Maximum allowed requests in the time window.
   */
  maxRequests: number;

  /**
   * Optional prefix for custom bucket segregation (e.g. 'auth-login', 'public-forms').
   */
  keyPrefix?: string;

  /**
   * If true, also keys against request body email / account identifier.
   */
  trackAccount?: boolean;
}

export const RATE_LIMIT_KEY = 'rate_limit';

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
