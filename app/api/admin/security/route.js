import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { securityLogger } from '../../../../lib/securityLogger';
import { withGeneralSecurity } from '../../../../lib/securityMiddleware';
import { logUnauthorizedAccess } from '../../../../lib/securityLogger';

// Apply security middleware
const secureGetHandler = withGeneralSecurity(
  async function getHandler(request) {
    try {
      const session = await getServerSession(authOptions);
      
      if (!session || session.user.role !== 'admin') {
        await logUnauthorizedAccess(
          session?.user?.id || null,
          'admin_security_dashboard',
          {
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            url: request.url
          }
        );
        
        return NextResponse.json(
          { error: 'Unauthorized - Admin access required' },
          { status: 401 }
        );
      }

      const { searchParams } = new URL(request.url);
      const hours = parseInt(searchParams.get('hours')) || 24;
      const level = searchParams.get('level') || null;

      // Get security statistics
      const stats = await securityLogger.getSecurityStats(hours);
      
      // Get recent security logs
      const recentLogs = await securityLogger.getRecentLogs(hours, level);

      // Calculate additional metrics
      const metrics = {
        totalEvents: stats.total,
        criticalEvents: stats.byLevel.CRITICAL || 0,
        highSeverityEvents: stats.byLevel.HIGH || 0,
        mediumSeverityEvents: stats.byLevel.MEDIUM || 0,
        lowSeverityEvents: stats.byLevel.LOW || 0,
        suspiciousUsers: stats.suspiciousUsers.length,
        topThreats: Object.entries(stats.byEvent)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([event, count]) => ({ event, count })),
        timeRange: {
          hours,
          from: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        }
      };

      return NextResponse.json({
        success: true,
        data: {
          metrics,
          statistics: stats,
          recentLogs: recentLogs.slice(0, 100), // Limit to 100 most recent
          summary: {
            securityScore: calculateSecurityScore(stats),
            riskLevel: calculateRiskLevel(stats),
            recommendations: generateRecommendations(stats)
          }
        }
      });

    } catch (error) {
      console.error('Error fetching security data:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

function calculateSecurityScore(stats) {
  // Simple security score calculation (0-100)
  let score = 100;
  
  // Deduct points for security events
  score -= (stats.byLevel.CRITICAL || 0) * 20;
  score -= (stats.byLevel.HIGH || 0) * 10;
  score -= (stats.byLevel.MEDIUM || 0) * 5;
  score -= (stats.byLevel.LOW || 0) * 1;
  
  // Ensure score doesn't go below 0
  return Math.max(0, score);
}

function calculateRiskLevel(stats) {
  const criticalEvents = stats.byLevel.CRITICAL || 0;
  const highEvents = stats.byLevel.HIGH || 0;
  const mediumEvents = stats.byLevel.MEDIUM || 0;
  
  if (criticalEvents > 0) return 'CRITICAL';
  if (highEvents > 5) return 'HIGH';
  if (highEvents > 0 || mediumEvents > 10) return 'MEDIUM';
  return 'LOW';
}

function generateRecommendations(stats) {
  const recommendations = [];
  
  if ((stats.byLevel.CRITICAL || 0) > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      message: 'Critical security events detected. Immediate investigation required.',
      action: 'Review critical events and take immediate action'
    });
  }
  
  if ((stats.byEvent.excessive_failed_logins || 0) > 5) {
    recommendations.push({
      priority: 'HIGH',
      message: 'Multiple failed login attempts detected.',
      action: 'Consider implementing account lockout policies'
    });
  }
  
  if ((stats.byEvent.rate_limit_exceeded || 0) > 10) {
    recommendations.push({
      priority: 'MEDIUM',
      message: 'High number of rate limit violations.',
      action: 'Review and potentially tighten rate limiting rules'
    });
  }
  
  if ((stats.byEvent.suspicious_activity || 0) > 0) {
    recommendations.push({
      priority: 'HIGH',
      message: 'Suspicious activity patterns detected.',
      action: 'Investigate user behavior patterns and consider additional monitoring'
    });
  }
  
  if (stats.suspiciousUsers.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      message: `${stats.suspiciousUsers.length} users flagged for suspicious activity.`,
      action: 'Review flagged user accounts and consider additional verification'
    });
  }
  
  // If no issues found
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'LOW',
      message: 'No significant security issues detected.',
      action: 'Continue monitoring and maintain current security measures'
    });
  }
  
  return recommendations;
}

export const GET = secureGetHandler;