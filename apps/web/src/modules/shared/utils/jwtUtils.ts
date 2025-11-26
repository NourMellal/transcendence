// apps/web/src/modules/shared/utils/jwtUtils.ts
// JWT decoding and validation utilities (no verification, just parsing)

import type { JWTPayload } from '../types/http.types';

/**
 * Decode JWT token without verification
 * (Verification happens on the server side)
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[jwtUtils] Invalid JWT format');
      return null;
    }

    // Decode base64url payload
    const payload = parts[1];
    const decoded = base64UrlDecode(payload);

    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error('[jwtUtils] Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired (with buffer)
 * @param token - JWT token string
 * @param bufferSeconds - Refresh buffer in seconds (default: 300 = 5 minutes)
 * @returns true if token is expired or will expire within buffer time
 */
export function isTokenExpired(token: string, bufferSeconds: number = 300): boolean {
  const payload = decodeJWT(token);

  if (!payload || !payload.exp) {
    return true; // Treat invalid tokens as expired
  }

  const expirationTime = payload.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const bufferTime = bufferSeconds * 1000;

  return currentTime >= (expirationTime - bufferTime);
}

/**
 * Get token expiration time in milliseconds
 */
export function getTokenExpiration(token: string): number | null {
  const payload = decodeJWT(token);

  if (!payload || !payload.exp) {
    return null;
  }

  return payload.exp * 1000;
}

/**
 * Get time until token expiration in milliseconds
 */
export function getTimeUntilExpiration(token: string): number | null {
  const expiration = getTokenExpiration(token);

  if (!expiration) {
    return null;
  }

  const timeUntil = expiration - Date.now();
  return Math.max(0, timeUntil);
}

/**
 * Base64URL decode (handles URL-safe base64 encoding used in JWTs)
 */
function base64UrlDecode(str: string): string {
  // Replace URL-safe characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  const pad = base64.length % 4;
  if (pad) {
    if (pad === 1) {
      throw new Error('Invalid base64url string');
    }
    base64 += '='.repeat(4 - pad);
  }

  // Decode base64
  try {
    // Use atob for browser, Buffer for Node.js
    if (typeof atob !== 'undefined') {
      return decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } else {
      // Node.js environment
      return Buffer.from(base64, 'base64').toString('utf-8');
    }
  } catch (error) {
    throw new Error('Failed to decode base64: ' + error);
  }
}
