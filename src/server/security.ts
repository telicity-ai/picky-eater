import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

export const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

/** 256 bits, URL-safe. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Constant-time string comparison. */
export function safeEqual(a: string | undefined | null, b: string): boolean {
  if (typeof a !== 'string') return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Host header values we accept. Anything else (a DNS-rebound domain, for example) is rejected. */
export function allowedHostHeaders(port: number): Set<string> {
  return new Set([`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`]);
}

export function bearerToken(req: IncomingMessage): string | null {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  return h.slice('Bearer '.length).trim() || null;
}

/**
 * Headers of every response from the review listener. On a board over an existing page the app is
 * framed from the stage origin, and thumbnails (inert copies of the app) load its images and fonts
 * from there; nothing else is ever loaded.
 */
export function reviewHeaders(stageOrigins: string[] = []): Record<string, string> {
  const stage = stageOrigins.length ? ' ' + stageOrigins.join(' ') : '';
  return {
    'Content-Security-Policy': [
      "default-src 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob:${stage}`,
      `font-src data:${stage}`,
      "connect-src 'self'",
      `frame-src 'self'${stage}`,
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  };
}

/**
 * Read a request body with a hard size limit. Rejects with code "TOO_LARGE".
 *
 * The socket is deliberately not destroyed when the limit is exceeded: destroying it while the
 * client is still sending makes the client see a connection reset instead of the 413 response.
 * Excess bytes are discarded until the request ends; the server's requestTimeout bounds that.
 */
export function readBody(req: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const tooLarge = () => Object.assign(new Error('Request body too large'), { code: 'TOO_LARGE' });
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > limit) {
      reject(tooLarge());
      return;
    }
    let size = 0;
    let exceeded = false;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      if (exceeded) return;
      size += c.length;
      if (size > limit) {
        exceeded = true;
        chunks.length = 0;
        reject(tooLarge());
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
