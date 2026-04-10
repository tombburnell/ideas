import type { NextFunction, Request, Response } from 'express';
import { Logger } from '@nestjs/common';

const log = new Logger('HTTP');

/**
 * Logs one line per request after the response is sent (no bodies, no secrets).
 */
export function httpLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const ip = req.ip ?? req.socket?.remoteAddress ?? '-';
    log.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms ${ip}`);
  });
  next();
}
