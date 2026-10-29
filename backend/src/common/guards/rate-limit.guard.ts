import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { Request, Response } from 'express';

interface BucketEntry {
  timestamps: number[];
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly storage = new Map<string, BucketEntry>();

  constructor(private readonly reflector: Reflector) {
    // Periodic garbage collection every 5 minutes to prevent memory leaks
    setInterval(() => this.cleanupExpiredBuckets(), 5 * 60 * 1000).unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no rate limit options defined, allow request through
    if (!options) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const clientIp = this.getClientIp(req);
    const prefix = options.keyPrefix || `${req.method}_${req.baseUrl || req.path}`;
    
    let key = `${prefix}:${clientIp}`;
    if (options.trackAccount && req.body && typeof req.body.email === 'string') {
      const normalizedEmail = req.body.email.trim().toLowerCase();
      key = `${prefix}:${clientIp}:${normalizedEmail}`;
    }

    const now = Date.now();
    const windowMs = options.ttlSeconds * 1000;
    const windowStart = now - windowMs;

    let bucket = this.storage.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.storage.set(key, bucket);
    }

    // Prune timestamps older than window
    bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);

    const currentCount = bucket.timestamps.length;
    const remaining = Math.max(0, options.maxRequests - currentCount - 1);
    const oldestTimestamp = bucket.timestamps.length > 0 ? bucket.timestamps[0] : now;
    const resetSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

    // Set standard rate limit headers
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', options.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetSeconds > 0 ? resetSeconds : options.ttlSeconds);
    }

    if (currentCount >= options.maxRequests) {
      this.logger.warn(`Rate limit exceeded for key [${key}]. Blocked for ${resetSeconds}s.`);
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', resetSeconds);
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Too many requests. Rate limit exceeded. Please retry after ${resetSeconds} seconds.`,
          retryAfter: resetSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.timestamps.push(now);
    return true;
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }

  private cleanupExpiredBuckets() {
    const now = Date.now();
    for (const [key, bucket] of this.storage.entries()) {
      // If no timestamp in the last 15 minutes, delete entry
      if (bucket.timestamps.length === 0 || bucket.timestamps.every((t) => now - t > 15 * 60 * 1000)) {
        this.storage.delete(key);
      }
    }
  }

  /**
   * Helper for tests or admin resets.
   */
  clearBuckets() {
    this.storage.clear();
  }
}

