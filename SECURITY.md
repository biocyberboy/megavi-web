# Security Measures

This document outlines the security measures implemented in this Next.js application.

## 1. Rate Limiting

**Location:** `src/middleware.ts`

- **Limit:** 100 requests per minute per IP address
- **Window:** 60 seconds (1 minute)
- **Response:** HTTP 429 Too Many Requests with `Retry-After` header

### How it works:
- Tracks requests per IP address using an in-memory Map
- Automatically cleans up expired entries
- Returns rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### For Production:
Consider upgrading to Redis-based rate limiting for:
- Multi-instance deployments
- Persistent rate limit data
- Better performance

**Recommended services:**
- [Upstash](https://upstash.com/) (Serverless Redis)
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv) (for Vercel deployments)

## 2. Security Headers

**Locations:** `src/middleware.ts`, `next.config.ts`

### Implemented Headers:

1. **Strict-Transport-Security (HSTS)**
   - Forces HTTPS connections
   - Duration: 2 years (63072000 seconds)
   - Includes subdomains and preload directive

2. **X-Frame-Options: SAMEORIGIN**
   - Prevents clickjacking attacks
   - Only allows framing from same origin

3. **X-Content-Type-Options: nosniff**
   - Prevents MIME type sniffing
   - Protects against drive-by downloads

4. **X-XSS-Protection: 1; mode=block**
   - Enables browser XSS filtering
   - Blocks page rendering if attack detected

5. **Content-Security-Policy (CSP)**
   - Restricts resource loading sources
   - Prevents XSS and code injection attacks

6. **Referrer-Policy: strict-origin-when-cross-origin**
   - Controls referrer information sent
   - Protects user privacy

7. **Permissions-Policy**
   - Disables unnecessary browser features
   - Reduces attack surface

## 3. DDoS Protection

### Current Implementation:
- **In-memory rate limiting** (see section 1)
- **Request throttling** per IP address
- **Automatic cleanup** of rate limit data

### Additional Recommendations:

1. **Use a CDN with DDoS protection:**
   - [Cloudflare](https://www.cloudflare.com/)
   - [AWS CloudFront](https://aws.amazon.com/cloudfront/)
   - [Fastly](https://www.fastly.com/)

2. **Deploy behind a reverse proxy:**
   - Nginx with rate limiting
   - HAProxy
   - Traefik

3. **Enable Vercel's DDoS protection** (if using Vercel):
   - Automatically enabled on Pro/Enterprise plans
   - Configure in project settings

## 4. CORS Protection

**Location:** `src/lib/security.ts`

- Validates request origins
- Configurable allowed origins
- Proper preflight request handling

### Usage in API routes:
```typescript
import { getCorsHeaders } from '@/lib/security';

export async function GET(request: Request) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  return new Response(data, {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
```

## 5. Input Validation & Sanitization

**Location:** `src/lib/security.ts`

- **HTML sanitization:** Using `sanitize-html` package
- **Input length limits:** Configurable max length
- **Null byte removal:** Prevents null byte injection
- **Whitespace trimming:** Removes leading/trailing spaces

## 6. Bot Detection

**Location:** `src/lib/security.ts`

Detects common bot/crawler user agents:
- Search engine bots
- Scrapers
- Automated tools

Use for:
- Different rate limits for bots
- Analytics filtering
- Content delivery optimization

## 7. Environment Variables Security

### Required Security-Related Variables:

```env
# App URL for CORS validation
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Admin passcode (already implemented)
ADMIN_PASSCODE=your-secret-passcode

# Database URL (keep secure)
DATABASE_URL=your-database-url
```

### Best Practices:
- ✅ Never commit `.env` files to Git
- ✅ Use different values for dev/staging/production
- ✅ Rotate secrets regularly
- ✅ Use a secrets manager in production (AWS Secrets Manager, Vercel Environment Variables)

## 8. Additional Security Measures

### Already Implemented:
- ✅ Admin authentication with passcode
- ✅ Input sanitization for blog content
- ✅ Zod validation schemas
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS prevention (React auto-escaping + sanitize-html)

### Recommended Next Steps:

1. **Add CAPTCHA for forms:**
   - [hCaptcha](https://www.hcaptcha.com/)
   - [Google reCAPTCHA](https://www.google.com/recaptcha/)

2. **Implement Content Security Policy reporting:**
   ```typescript
   // Add to CSP header:
   report-uri: '/api/csp-report'
   ```

3. **Add security monitoring:**
   - [Sentry](https://sentry.io/) for error tracking
   - Log suspicious activity
   - Monitor rate limit violations

4. **Enable HTTPS only:**
   - Configure in hosting provider
   - Set up automatic HTTPS redirects

5. **Regular security audits:**
   ```bash
   npm audit
   npm audit fix
   ```

## 9. Testing Security

### Manual Testing:

1. **Test rate limiting:**
   ```bash
   # Send multiple requests rapidly
   for i in {1..150}; do curl https://your-domain.com/api/test; done
   ```

2. **Check security headers:**
   ```bash
   curl -I https://your-domain.com
   ```

3. **Test CORS:**
   ```bash
   curl -H "Origin: https://malicious-site.com" https://your-domain.com/api/test
   ```

### Automated Testing:
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [Security Headers](https://securityheaders.com/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)

## 10. Incident Response

If you detect a security issue:

1. **Immediate actions:**
   - Block malicious IPs in middleware
   - Enable stricter rate limits
   - Review logs for suspicious activity

2. **Investigation:**
   - Check server logs
   - Review database for unauthorized changes
   - Verify environment variables

3. **Mitigation:**
   - Patch vulnerabilities
   - Update dependencies
   - Rotate secrets if compromised

4. **Communication:**
   - Notify affected users if needed
   - Document incident and response
   - Update security measures

## Support

For security concerns or questions, please contact your security team or consult:
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
