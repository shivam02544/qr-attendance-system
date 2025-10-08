# Security Implementation Guide

This document outlines the security measures implemented in the QR Attendance System.

## Overview

The QR Attendance System implements comprehensive security measures to protect against common web vulnerabilities and ensure data integrity. This includes input validation, rate limiting, CSRF protection, security logging, and suspicious activity detection.

## Security Features

### 1. Rate Limiting

**Implementation**: `lib/securityMiddleware.js`

Rate limiting is implemented to prevent abuse and DoS attacks:

- **Attendance attempts**: 10 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP  
- **Registration**: 3 requests per hour per IP
- **QR generation**: 20 requests per 5 minutes per IP
- **General API**: 100 requests per 15 minutes per IP

**Usage**:
```javascript
import { withAttendanceSecurity } from '../lib/securityMiddleware';

export const POST = withAttendanceSecurity(async function(request) {
  // Your handler code
});
```

### 2. Input Validation and Sanitization

**Implementation**: `lib/security.js`, `lib/validation.js`

All user inputs are validated and sanitized:

- **XSS Prevention**: Removes script tags, event handlers, and dangerous HTML
- **SQL Injection Prevention**: Input sanitization and parameterized queries
- **Data Type Validation**: Strict validation of coordinates, emails, passwords
- **Length Limits**: Enforced maximum lengths for all text inputs

**Example**:
```javascript
import { sanitizeObject, validateEmail } from '../lib/security';

const sanitizedData = sanitizeObject(userInput);
const emailError = validateEmail(email);
```

### 3. CSRF Protection

**Implementation**: `lib/security.js`

- Origin validation for all requests
- CSRF token generation and validation
- Secure headers implementation

### 4. Security Headers

**Implementation**: `lib/security.js`

Automatically added to all responses:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy`: Comprehensive CSP policy
- `Permissions-Policy`: Restricts geolocation and camera access

### 5. Security Logging

**Implementation**: `lib/securityLogger.js`

Comprehensive logging of security events:

- **Event Types**: Login attempts, suspicious activity, rate limit violations
- **Log Levels**: LOW, MEDIUM, HIGH, CRITICAL
- **Storage**: File-based logging with rotation
- **Alerting**: Automatic alerts for high-severity events

**Usage**:
```javascript
import { logSecurityEvent, LOG_LEVELS, SECURITY_EVENTS } from '../lib/securityLogger';

await logSecurityEvent(
  SECURITY_EVENTS.LOGIN_FAILED,
  LOG_LEVELS.MEDIUM,
  { ip, reason: 'invalid_password' },
  userId
);
```

### 6. Suspicious Activity Detection

**Implementation**: `lib/security.js`

Real-time detection of suspicious patterns:

- **Excessive failed logins**: 5+ failed attempts in 1 hour
- **Rapid location changes**: Movement >10km in <1 hour
- **Multiple simultaneous sessions**: 3+ different IPs in 1 hour
- **Excessive requests**: Unusual API usage patterns

### 7. Location Verification Security

**Implementation**: Enhanced in attendance APIs

- **Coordinate validation**: Strict lat/lng range checking
- **Distance calculation**: Haversine formula for accuracy
- **Spoofing detection**: Flags rapid location changes
- **Tolerance settings**: Configurable proximity requirements

### 8. Authentication Security

**Implementation**: Enhanced in auth APIs

- **Password complexity**: Minimum 8 chars, mixed case, numbers
- **Account lockout**: Temporary lockout after failed attempts
- **Session security**: Secure cookie configuration
- **Role-based access**: Strict authorization checks

## Security Configuration

### Environment Variables

```env
# Security settings
SECURITY_RATE_LIMIT_ENABLED=true
SECURITY_LOG_LEVEL=MEDIUM
SECURITY_WEBHOOK_URL=https://your-webhook-url
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

### Rate Limit Configuration

Modify `lib/securityMiddleware.js` to adjust rate limits:

```javascript
export const rateLimitConfigs = {
  attendance: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // requests per window
    message: 'Too many attendance attempts'
  }
};
```

## Security Monitoring

### Admin Security Dashboard

Access security metrics at `/api/admin/security`:

- Real-time security statistics
- Recent security events
- Risk level assessment
- Security recommendations

### Log Analysis

Security logs are stored in `logs/security/` directory:

```bash
# View recent security events
tail -f logs/security/security-$(date +%Y-%m-%d).log

# Search for specific events
grep "CRITICAL" logs/security/*.log
```

## Security Testing

### Running Security Tests

```bash
# Run all security tests
npm test tests/security/

# Run specific test suites
npm test tests/security/security.test.js
npm test tests/security/vulnerability.test.js
```

### Test Coverage

Security tests cover:

- Input sanitization and validation
- Rate limiting functionality
- Suspicious activity detection
- Authentication and authorization
- Common vulnerability prevention

## Security Best Practices

### For Developers

1. **Always validate inputs**: Use validation schemas for all user inputs
2. **Apply rate limiting**: Use appropriate middleware for all endpoints
3. **Log security events**: Log all authentication and authorization events
4. **Handle errors securely**: Don't expose internal details in error messages
5. **Use HTTPS**: Ensure all communications are encrypted

### For Administrators

1. **Monitor logs regularly**: Check security logs for unusual patterns
2. **Update dependencies**: Keep all packages up to date
3. **Review user accounts**: Regularly audit user accounts and permissions
4. **Configure alerts**: Set up monitoring for critical security events
5. **Backup security logs**: Ensure logs are backed up and retained

## Incident Response

### Security Event Response

1. **Immediate**: Check security dashboard for active threats
2. **Investigation**: Review security logs for event details
3. **Containment**: Apply additional rate limits or block IPs if needed
4. **Recovery**: Reset affected user accounts if compromised
5. **Documentation**: Document incident and response actions

### Emergency Contacts

- **System Administrator**: [Contact Information]
- **Security Team**: [Contact Information]
- **Development Team**: [Contact Information]

## Compliance and Auditing

### Security Audit Checklist

- [ ] All endpoints have appropriate rate limiting
- [ ] Input validation is applied consistently
- [ ] Security headers are present on all responses
- [ ] Authentication is properly implemented
- [ ] Authorization checks are in place
- [ ] Security logging is comprehensive
- [ ] Suspicious activity detection is active
- [ ] Error handling doesn't expose sensitive data

### Regular Security Tasks

- **Weekly**: Review security logs and statistics
- **Monthly**: Update security configurations as needed
- **Quarterly**: Conduct security testing and vulnerability assessment
- **Annually**: Complete comprehensive security audit

## Known Limitations

1. **Rate limiting storage**: Currently uses in-memory storage (use Redis in production)
2. **Log storage**: File-based logging (consider centralized logging in production)
3. **Alert system**: Basic console alerts (integrate with monitoring systems)
4. **Geographic validation**: Basic distance calculation (consider more sophisticated methods)

## Future Enhancements

1. **Advanced threat detection**: Machine learning-based anomaly detection
2. **Real-time monitoring**: Integration with security monitoring platforms
3. **Automated response**: Automatic blocking of suspicious IPs
4. **Enhanced logging**: Integration with SIEM systems
5. **Compliance reporting**: Automated compliance report generation

## Support

For security-related questions or to report vulnerabilities:

- **Email**: security@your-domain.com
- **Documentation**: See additional security docs in `/docs/security/`
- **Issue Tracker**: Use security label for security-related issues