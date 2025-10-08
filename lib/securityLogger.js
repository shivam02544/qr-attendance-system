// Security logging system

import fs from 'fs/promises';
import path from 'path';

// Security log levels
export const LOG_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// Security event types
export const SECURITY_EVENTS = {
  // Authentication events
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  REGISTRATION: 'registration',
  
  // Authorization events
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  PERMISSION_DENIED: 'permission_denied',
  
  // Rate limiting events
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  
  // Suspicious activity
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  MULTIPLE_FAILED_LOGINS: 'multiple_failed_logins',
  RAPID_LOCATION_CHANGE: 'rapid_location_change',
  EXCESSIVE_REQUESTS: 'excessive_requests',
  
  // Input validation
  INVALID_INPUT: 'invalid_input',
  POTENTIAL_INJECTION: 'potential_injection',
  
  // System events
  SYSTEM_ERROR: 'system_error',
  CONFIGURATION_CHANGE: 'configuration_change',
  
  // Attendance specific
  ATTENDANCE_MARKED: 'attendance_marked',
  ATTENDANCE_FAILED: 'attendance_failed',
  QR_GENERATED: 'qr_generated',
  INVALID_QR_SCAN: 'invalid_qr_scan',
  LOCATION_VERIFICATION_FAILED: 'location_verification_failed'
};

class SecurityLogger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs', 'security');
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create security log directory:', error);
    }
  }

  async log(event, level, details = {}, userId = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      level,
      userId,
      details: {
        ...details,
        userAgent: details.userAgent || 'unknown',
        ip: details.ip || 'unknown',
        url: details.url || 'unknown'
      },
      id: this.generateLogId()
    };

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY ${level}] ${event}:`, logEntry);
    }

    // Write to file
    await this.writeToFile(logEntry);

    // Send alerts for high/critical events
    if (level === LOG_LEVELS.HIGH || level === LOG_LEVELS.CRITICAL) {
      await this.sendAlert(logEntry);
    }

    return logEntry.id;
  }

  async writeToFile(logEntry) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `security-${date}.log`;
      const filepath = path.join(this.logDir, filename);
      
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(filepath, logLine);
    } catch (error) {
      console.error('Failed to write security log:', error);
    }
  }

  async sendAlert(logEntry) {
    // In production, integrate with alerting systems like:
    // - Email notifications
    // - Slack/Teams webhooks
    // - PagerDuty
    // - Security monitoring tools
    
    console.warn('🚨 SECURITY ALERT:', {
      event: logEntry.event,
      level: logEntry.level,
      timestamp: logEntry.timestamp,
      details: logEntry.details
    });

    // Example: Send to webhook (uncomment and configure in production)
    /*
    try {
      await fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Security Alert: ${logEntry.event}`,
          attachments: [{
            color: logEntry.level === LOG_LEVELS.CRITICAL ? 'danger' : 'warning',
            fields: [
              { title: 'Event', value: logEntry.event, short: true },
              { title: 'Level', value: logEntry.level, short: true },
              { title: 'User ID', value: logEntry.userId || 'N/A', short: true },
              { title: 'IP', value: logEntry.details.ip, short: true },
              { title: 'Details', value: JSON.stringify(logEntry.details, null, 2) }
            ]
          }]
        })
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
    */
  }

  generateLogId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Convenience methods for different event types
  async logLoginAttempt(success, userId, details = {}) {
    const event = success ? SECURITY_EVENTS.LOGIN_SUCCESS : SECURITY_EVENTS.LOGIN_FAILED;
    const level = success ? LOG_LEVELS.LOW : LOG_LEVELS.MEDIUM;
    
    return this.log(event, level, details, userId);
  }

  async logSuspiciousActivity(activityType, userId, details = {}) {
    return this.log(
      SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
      LOG_LEVELS.HIGH,
      { activityType, ...details },
      userId
    );
  }

  async logRateLimitExceeded(endpoint, ip, details = {}) {
    return this.log(
      SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
      LOG_LEVELS.MEDIUM,
      { endpoint, ip, ...details }
    );
  }

  async logAttendanceEvent(success, userId, details = {}) {
    const event = success ? SECURITY_EVENTS.ATTENDANCE_MARKED : SECURITY_EVENTS.ATTENDANCE_FAILED;
    const level = success ? LOG_LEVELS.LOW : LOG_LEVELS.MEDIUM;
    
    return this.log(event, level, details, userId);
  }

  async logInvalidInput(input, endpoint, details = {}) {
    return this.log(
      SECURITY_EVENTS.INVALID_INPUT,
      LOG_LEVELS.MEDIUM,
      { input: this.sanitizeForLog(input), endpoint, ...details }
    );
  }

  async logUnauthorizedAccess(userId, resource, details = {}) {
    return this.log(
      SECURITY_EVENTS.UNAUTHORIZED_ACCESS,
      LOG_LEVELS.HIGH,
      { resource, ...details },
      userId
    );
  }

  sanitizeForLog(data) {
    if (typeof data === 'string') {
      // Remove potential sensitive data
      return data
        .replace(/password/gi, '[REDACTED]')
        .replace(/token/gi, '[REDACTED]')
        .replace(/key/gi, '[REDACTED]')
        .substring(0, 500); // Limit length
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        if (/password|token|key|secret/i.test(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeForLog(value);
        }
      }
      return sanitized;
    }
    
    return data;
  }

  // Query logs for analysis
  async getRecentLogs(hours = 24, level = null) {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files.filter(f => f.startsWith('security-') && f.endsWith('.log'));
      
      const logs = [];
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      for (const file of logFiles.slice(-7)) { // Last 7 days max
        const filepath = path.join(this.logDir, file);
        const content = await fs.readFile(filepath, 'utf8');
        const lines = content.trim().split('\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const logEntry = JSON.parse(line);
            const logTime = new Date(logEntry.timestamp);
            
            if (logTime >= cutoffTime) {
              if (!level || logEntry.level === level) {
                logs.push(logEntry);
              }
            }
          } catch (error) {
            // Skip invalid log lines
          }
        }
      }
      
      return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Failed to read security logs:', error);
      return [];
    }
  }

  // Get security statistics
  async getSecurityStats(hours = 24) {
    const logs = await this.getRecentLogs(hours);
    
    const stats = {
      total: logs.length,
      byLevel: {},
      byEvent: {},
      byHour: {},
      topIPs: {},
      suspiciousUsers: new Set()
    };

    // Initialize counters
    Object.values(LOG_LEVELS).forEach(level => {
      stats.byLevel[level] = 0;
    });

    Object.values(SECURITY_EVENTS).forEach(event => {
      stats.byEvent[event] = 0;
    });

    // Process logs
    logs.forEach(log => {
      // Count by level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // Count by event
      stats.byEvent[log.event] = (stats.byEvent[log.event] || 0) + 1;
      
      // Count by hour
      const hour = new Date(log.timestamp).getHours();
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
      
      // Count by IP
      const ip = log.details.ip;
      if (ip && ip !== 'unknown') {
        stats.topIPs[ip] = (stats.topIPs[ip] || 0) + 1;
      }
      
      // Track suspicious users
      if (log.level === LOG_LEVELS.HIGH || log.level === LOG_LEVELS.CRITICAL) {
        if (log.userId) {
          stats.suspiciousUsers.add(log.userId);
        }
      }
    });

    // Convert Set to Array
    stats.suspiciousUsers = Array.from(stats.suspiciousUsers);

    // Sort top IPs
    stats.topIPs = Object.entries(stats.topIPs)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [ip, count]) => {
        obj[ip] = count;
        return obj;
      }, {});

    return stats;
  }
}

// Export singleton instance
export const securityLogger = new SecurityLogger();

// Convenience functions
export const logSecurityEvent = (event, level, details, userId) => 
  securityLogger.log(event, level, details, userId);

export const logLoginAttempt = (success, userId, details) => 
  securityLogger.logLoginAttempt(success, userId, details);

export const logSuspiciousActivity = (activityType, userId, details) => 
  securityLogger.logSuspiciousActivity(activityType, userId, details);

export const logRateLimitExceeded = (endpoint, ip, details) => 
  securityLogger.logRateLimitExceeded(endpoint, ip, details);

export const logAttendanceEvent = (success, userId, details) => 
  securityLogger.logAttendanceEvent(success, userId, details);

export const logInvalidInput = (input, endpoint, details) => 
  securityLogger.logInvalidInput(input, endpoint, details);

export const logUnauthorizedAccess = (userId, resource, details) => 
  securityLogger.logUnauthorizedAccess(userId, resource, details);