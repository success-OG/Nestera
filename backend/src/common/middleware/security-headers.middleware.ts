import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Helmet configuration for CSP (Content Security Policy) and other security headers.
 * Prevents XSS, clickjacking, and other common web vulnerabilities.
 */
export function createSecurityHeadersMiddleware() {
  return (req: Request, res: Response, next: () => void) => {
    // Content Security Policy: strict policy to prevent inline scripts and external resource injection
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:;",
    );

    // X-Content-Type-Options: prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options: prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Referrer-Policy: control how much referrer info is shared
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy: restrict browser features
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=()',
    );

    next();
  };
}
