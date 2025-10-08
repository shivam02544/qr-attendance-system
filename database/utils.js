import connectDB from '../lib/mongodb.js';
import { 
  User, 
  Class, 
  Enrollment, 
  AttendanceSession, 
  AttendanceRecord 
} from '../models/index.js';

/**
 * Database utility functions for common operations
 */

// Initialize database connection and ensure indexes
export async function initializeDatabase() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    // Ensure indexes are created
    await Promise.all([
      User.createIndexes(),
      Class.createIndexes(),
      Enrollment.createIndexes(),
      AttendanceSession.createIndexes(),
      AttendanceRecord.createIndexes()
    ]);
    
    console.log('Database indexes created successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Health check for database connection
export async function checkDatabaseHealth() {
  try {
    await connectDB();
    
    // Test basic operations
    const userCount = await User.countDocuments();
    const classCount = await Class.countDocuments();
    
    return {
      status: 'healthy',
      connected: true,
      collections: {
        users: userCount,
        classes: classCount
      },
      timestamp: new Date()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

// Clean up expired sessions (can be run as a cron job)
export async function cleanupExpiredSessions() {
  try {
    await connectDB();
    const result = await AttendanceSession.cleanupExpired();
    console.log(`Cleaned up ${result.modifiedCount} expired sessions`);
    return result;
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error);
    throw error;
  }
}

// Get system statistics
export async function getSystemStats() {
  try {
    await connectDB();
    
    const [
      totalUsers,
      totalTeachers,
      totalStudents,
      totalClasses,
      totalEnrollments,
      activeSessions,
      totalAttendanceRecords
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'teacher', isActive: true }),
      User.countDocuments({ role: 'student', isActive: true }),
      Class.countDocuments(),
      Enrollment.countDocuments({ isActive: true }),
      AttendanceSession.countDocuments({
        isActive: true,
        expiresAt: { $gt: new Date() }
      }),
      AttendanceRecord.countDocuments()
    ]);
    
    return {
      users: {
        total: totalUsers,
        teachers: totalTeachers,
        students: totalStudents,
        admins: totalUsers - totalTeachers - totalStudents
      },
      classes: totalClasses,
      enrollments: totalEnrollments,
      sessions: {
        active: activeSessions
      },
      attendance: {
        totalRecords: totalAttendanceRecords
      },
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Failed to get system stats:', error);
    throw error;
  }
}

// Backup essential data (for development/testing)
export async function backupData() {
  try {
    await connectDB();
    
    const [users, classes, enrollments] = await Promise.all([
      User.find({}).select('-passwordHash'),
      Class.find({}),
      Enrollment.find({ isActive: true })
    ]);
    
    return {
      users,
      classes,
      enrollments,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Failed to backup data:', error);
    throw error;
  }
}

// Validate database schema and data integrity
export async function validateDataIntegrity() {
  try {
    await connectDB();
    
    const issues = [];
    
    // Check for orphaned enrollments
    const enrollments = await Enrollment.find({ isActive: true });
    for (const enrollment of enrollments) {
      const student = await User.findById(enrollment.studentId);
      const classDoc = await Class.findById(enrollment.classId);
      
      if (!student) {
        issues.push(`Orphaned enrollment: student ${enrollment.studentId} not found`);
      }
      if (!classDoc) {
        issues.push(`Orphaned enrollment: class ${enrollment.classId} not found`);
      }
    }
    
    // Check for orphaned attendance sessions
    const sessions = await AttendanceSession.find({ isActive: true });
    for (const session of sessions) {
      const classDoc = await Class.findById(session.classId);
      if (!classDoc) {
        issues.push(`Orphaned session: class ${session.classId} not found`);
      }
    }
    
    // Check for orphaned attendance records
    const records = await AttendanceRecord.find({}).limit(100); // Sample check
    for (const record of records) {
      const student = await User.findById(record.studentId);
      const session = await AttendanceSession.findById(record.sessionId);
      
      if (!student) {
        issues.push(`Orphaned attendance record: student ${record.studentId} not found`);
      }
      if (!session) {
        issues.push(`Orphaned attendance record: session ${record.sessionId} not found`);
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Failed to validate data integrity:', error);
    throw error;
  }
}

export default {
  initializeDatabase,
  checkDatabaseHealth,
  cleanupExpiredSessions,
  getSystemStats,
  backupData,
  validateDataIntegrity
};