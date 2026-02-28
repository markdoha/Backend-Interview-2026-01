import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly requests: RateLimitStore = {};
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(private readonly configService: ConfigService) {
    this.maxRequests = this.configService.get<number>('RATE_LIMIT_MAX', 10);
    this.windowMs = this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 60000);
    this.cleanupExpiredEntries();
  }

  use(req: Request, res: Response, next: NextFunction) {
    const ip = this.getClientIp(req);
    const now = Date.now();

    if (!this.requests[ip]) {
      this.requests[ip] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return next();
    }

    const entry = this.requests[ip];

    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + this.windowMs;
      return next();
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
      
      throw new HttpException(
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (this.maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());

    next();
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private cleanupExpiredEntries() {
    setInterval(() => {
      const now = Date.now();
      for (const ip in this.requests) {
        if (this.requests[ip].resetTime < now) {
          delete this.requests[ip];
        }
      }
    }, this.windowMs);
  }
}
