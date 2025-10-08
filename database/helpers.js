import User from '../models/User.js';
import Class from '../models/Class.js';
import Enrollment from '../models/Enrollment.js';
import AttendanceSession from '../models/AttendanceSession.js';
import AttendanceRecord from '../models/AttendanceRecord.js';

/**
 * User Helper Functions
 */
export const userHelpers = {
  // Create a new user with hashed password
  async createUser(userData) {
    return await User.create(userData);
  },
  
  // Find user by email
  async findByEmail(email) {
    return await User.findOne({ email, isActive: true });
  },
  
  // Authenticate user
  async authenticate(email, password) {
    const user = await User.findOne({ email, isActive: true });
    if (!user) return null;
    
    const isValid = await user.comparePassword(password);
    return isValid ? user.toSafeObject() : null;
  },
  
  // Get users by role
  async getUsersByRole(role) {
    return await User.findByRole(role);
  },
  
  // Update user status
  async updateUserStatus(userId, isActive) {
    return await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select('-passwordHash');
  }
};

/**
 * Class Helper Functions
 */
export const classHelpers = {
  // Create a new class
  async createClass(classData) {
    return await Class.create(classData);
  },
  
  // Get classes by teacher
  async getTeacherClasses(teacherId) {
    return await Class.findByTeacher(teacherId);
  },
  
  // Get class with enrollment count
  async getClassWithStats(classId) {
    const classData = await Class.findById(classId)
      .populate('teacherId', 'name email');
    
    if (!classData) return null;
    
    const enrollmentCount = await Enrollment.getClassEnrollmentCount(classId);
    const activeSessionCount = await AttendanceSession.countDocuments({
      classId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    
    return {
      ...classData.toObject(),
      enrollmentCount,
      hasActiveSession: activeSessionCount > 0
    };
  },
  
  // Find classes near a location
  async findNearbyClasses(lat, lng, maxDistance = 1000) {
    return await Class.findNearLocation(lat, lng, maxDistance);
  }
};

/**
 * Enrollment Helper Functions
 */
export const enrollmentHelpers = {
  // Enroll student in class
  async enrollStudent(studentId, classId) {
    // Check if already enrolled
    const existing = await Enrollment.findOne({
      studentId,
      classId,
      isActive: true
    });
    
    if (existing) {
      throw new Error('Student is already enrolled in this class');
    }
    
    return await Enrollment.create({ studentId, classId });
  },
  
  // Get student's enrolled classes
  async getStudentClasses(studentId) {
    return await Enrollment.findByStudent(studentId);
  },
  
  // Get class roster
  async getClassRoster(classId) {
    return await Enrollment.findByClass(classId);
  },
  
  // Unenroll student
  async unenrollStudent(studentId, classId) {
    const enrollment = await Enrollment.findOne({
      studentId,
      classId,
      isActive: true
    });
    
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }
    
    return await enrollment.deactivate();
  }
};

/**
 * Attendance Session Helper Functions
 */
export const sessionHelpers = {
  // Create new attendance session
  async createSession(classId, durationMinutes = 30) {
    return await AttendanceSession.createForClass(classId, durationMinutes);
  },
  
  // Get active session for class
  async getActiveSession(classId) {
    const sessions = await AttendanceSession.findActiveByClass(classId);
    return sessions.length > 0 ? sessions[0] : null;
  },
  
  // Validate session token
  async validateSession(sessionToken) {
    return await AttendanceSession.findValidByToken(sessionToken);
  },
  
  // End session
  async endSession(sessionId) {
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    return await session.deactivate();
  },
  
  // Cleanup expired sessions
  async cleanupExpiredSessions() {
    return await AttendanceSession.cleanupExpired();
  }
};

/**
 * Attendance Record Helper Functions
 */
export const attendanceHelpers = {
  // Mark attendance
  async markAttendance(sessionToken, studentId, studentLocation) {
    // Validate session
    const session = await AttendanceSession.findValidByToken(sessionToken);
    if (!session) {
      throw new Error('Invalid or expired session');
    }
    
    // Check if already marked
    const existing = await AttendanceRecord.hasStudentAttended(session._id, studentId);
    if (existing) {
      throw new Error('Attendance already marked for this session');
    }
    
    // Verify location (within 100 meters of class)
    const classLocation = session.classId.location;
    const distance = calculateDistance(
      studentLocation.lat,
      studentLocation.lng,
      classLocation.lat,
      classLocation.lng
    );
    
    if (distance > 100) { // 100 meters tolerance
      throw new Error(`You are too far from the classroom (${Math.round(distance)}m away). Please move closer.`);
    }
    
    // Create attendance record
    return await AttendanceRecord.create({
      sessionId: session._id,
      studentId,
      studentLocation
    });
  },
  
  // Get student attendance history
  async getStudentAttendance(studentId, startDate, endDate) {
    return await AttendanceRecord.findByStudent(studentId, startDate, endDate);
  },
  
  // Get class attendance records
  async getClassAttendance(classId, startDate, endDate) {
    return await AttendanceRecord.findByClass(classId, startDate, endDate);
  },
  
  // Get attendance statistics for a class
  async getClassAttendanceStats(classId, startDate, endDate) {
    return await AttendanceRecord.getClassStats(classId, startDate, endDate);
  },
  
  // Get session attendance
  async getSessionAttendance(sessionId) {
    return await AttendanceRecord.findBySession(sessionId);
  }
};

/**
 * Utility Functions
 */

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Validate coordinates
export function validateCoordinates(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Coordinates must be numbers');
  }
  
  if (lat < -90 || lat > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }
  
  if (lng < -180 || lng > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }
  
  return true;
}

// Format attendance data for reports
export function formatAttendanceReport(attendanceData) {
  return attendanceData.map(record => ({
    studentName: record.student?.name || record.studentName,
    studentEmail: record.student?.email || record.studentEmail,
    className: record.class?.name || record.className,
    subject: record.class?.subject || record.subject,
    markedAt: record.markedAt,
    distance: record.distanceFromClass ? `${Math.round(record.distanceFromClass)}m` : 'N/A'
  }));
}

// Get dashboard statistics
export async function getDashboardStats(userId, userRole) {
  const stats = {};
  
  switch (userRole) {
    case 'admin':
      stats.totalUsers = await User.countDocuments({ isActive: true });
      stats.totalTeachers = await User.countDocuments({ role: 'teacher', isActive: true });
      stats.totalStudents = await User.countDocuments({ role: 'student', isActive: true });
      stats.totalClasses = await Class.countDocuments();
      stats.totalEnrollments = await Enrollment.countDocuments({ isActive: true });
      stats.activeSessions = await AttendanceSession.countDocuments({
        isActive: true,
        expiresAt: { $gt: new Date() }
      });
      break;
      
    case 'teacher':
      const teacherClasses = await Class.find({ teacherId: userId });
      const classIds = teacherClasses.map(c => c._id);
      
      stats.totalClasses = teacherClasses.length;
      stats.totalEnrollments = await Enrollment.countDocuments({
        classId: { $in: classIds },
        isActive: true
      });
      stats.activeSessions = await AttendanceSession.countDocuments({
        classId: { $in: classIds },
        isActive: true,
        expiresAt: { $gt: new Date() }
      });
      break;
      
    case 'student':
      const studentEnrollments = await Enrollment.find({
        studentId: userId,
        isActive: true
      });
      const enrolledClassIds = studentEnrollments.map(e => e.classId);
      
      stats.enrolledClasses = studentEnrollments.length;
      stats.totalAttendance = await AttendanceRecord.countDocuments({
        studentId: userId
      });
      stats.availableSessions = await AttendanceSession.countDocuments({
        classId: { $in: enrolledClassIds },
        isActive: true,
        expiresAt: { $gt: new Date() }
      });
      break;
  }
  
  return stats;
}