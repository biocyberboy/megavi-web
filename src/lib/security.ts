/**
 * Security utilities for protecting against common attacks
 */

import { headers } from "next/headers";

/**
 * Verify request origin to prevent CSRF attacks
 */
export async function verifyOrigin(allowedOrigins: string[] = []): Promise<boolean> {
  const headersList = await headers();
  const origin = headersList.get("origin");
  const host = headersList.get("host");

  if (!origin) {
    // Same-origin requests may not have origin header
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const hostUrl = host ? `https://${host}` : null;

    // Check if origin matches host
    if (hostUrl && origin === hostUrl) {
      return true;
    }

    // Check against allowed origins
    if (allowedOrigins.includes(origin)) {
      return true;
    }

    // Check if origin host matches current host
    if (host && originUrl.host === host) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get client IP address from request headers
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers();

  // Try various headers set by proxies/load balancers
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const cfConnectingIp = headersList.get("cf-connecting-ip"); // Cloudflare
  const fastlyClientIp = headersList.get("fastly-client-ip"); // Fastly
  const trueClientIp = headersList.get("true-client-ip"); // Akamai

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwardedFor.split(",")[0].trim();
  }

  if (realIp) return realIp;
  if (cfConnectingIp) return cfConnectingIp;
  if (fastlyClientIp) return fastlyClientIp;
  if (trueClientIp) return trueClientIp;

  return "unknown";
}

/**
 * Validate and sanitize user input
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Check if request is from a bot/crawler
 */
export async function isBot(): Promise<boolean> {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent")?.toLowerCase() || "";

  const botPatterns = [
    "bot",
    "crawler",
    "spider",
    "scraper",
    "slurp",
    "curl",
    "wget",
    "python",
    "java",
    "go-http-client",
  ];

  return botPatterns.some((pattern) => userAgent.includes(pattern));
}

/**
 * Generate a simple hash for caching purposes (not cryptographic)
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Rate limit error response
 */
export function rateLimitError(retryAfter: number = 60) {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "You have exceeded the rate limit. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}

/**
 * CORS headers for API routes
 */
export function getCorsHeaders(origin?: string | null) {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter(Boolean);

  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0] || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}
