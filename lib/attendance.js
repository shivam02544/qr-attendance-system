/**
 * Attendance utility functions for validation and processing
 */

import AttendanceRecord from '../models/AttendanceRecord.js';
import AttendanceSession from '../models/AttendanceSession.js';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';
import { verifyLocationProximity } from './location.js';

/**
 * Validate attendance marking request
 * @param {Object} params - Validation parameters
 * @param {string} params.sessionToken - Session token from QR code
 * @param {Object} params.studentLocation - Student's current location
 * @param {string} params.studentId - Student's database ID
 * @returns {Object} Validation result
 */
export async function validateAttendanceRequest({
  sessionToken,
  studentLocation,
  studentId
}) {
  const errors = [];
  const warnings = [];

  try {
    // 1. Validate session token
    if (!sessionToken) {
      errors.push('Session token is required');
    } else {
      const session = await AttendanceSession.findValidByToken(sessionToken);
      if (!session) {
        // Check for more specific error
        const expiredSession = await AttendanceSession.findByToken(sessionToken);
        if (expiredSession) {
          if (!expiredSession.isActive) {
            errors.push('This attendance session has been ended by the teacher');
          } else if (expiredSession.isExpired) {
            errors.push('This QR code has expired. Please ask your teacher for a new one.');
          }
        } else {
          errors.push('Invalid QR code. Please scan a valid attendance QR code.');
        }
      }
    }

    // 2. Validate student location
    if (!studentLocation) {
      errors.push('Student location is required');
    } else {
      if (typeof studentLocation.lat !== 'number' || typeof studentLocation.lng !== 'number') {
        errors.push('Invalid location coordinates - latitude and longitude must be numbers');
      } else {
        // Validate coordinate ranges
        if (studentLocation.lat < -90 || studentLocation.lat > 90) {
          errors.push('Invalid latitude - must be between -90 and 90');
        }
        if (studentLocation.lng < -180 || studentLocation.lng > 180) {
          errors.push('Invalid longitude - must be between -180 and 180');
        }
      }
    }

    // 3. Validate student
    if (!studentId) {
      errors.push('Student ID is required');
    } else {
      const student = await User.findById(studentId);
      if (!student) {
        errors.push('Student not found');
      } else {
        if (student.role !== 'student') {
          errors.push('Only students can mark attendance');
        }
        if (!student.isActive) {
          errors.push('Inactive student cannot mark attendance');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    console.error('Error validating attendance request:', error);
    return {
      isValid: false,
      errors: ['Internal validation error'],
      warnings
    };
  }
}

/**
 * Check if student can mark attendance for a session
 * @param {string} sessionId - Attendance session ID
 * @param {string} studentId - Student ID
 * @returns {Object} Eligibility result
 */
export async function checkAttendanceEligibility(sessionId, studentId) {
  try {
    const session = await AttendanceSession.findById(sessionId).populate('classId');
    if (!session) {
      return {
        eligible: false,
        reason: 'Session not found'
      };
    }

    // Check if session is valid
    if (!session.isValid) {
      return {
        eligible: false,
        reason: session.isExpired ? 'Session expired' : 'Session inactive'
      };
    }

    // Check enrollment
    const isEnrolled = await Enrollment.isStudentEnrolled(studentId, session.classId._id);
    if (!isEnrolled) {
      return {
        eligible: false,
        reason: 'Student not enrolled in class',
        className: session.classId.name
      };
    }

    // Check for existing attendance
    const hasAttended = await AttendanceRecord.hasStudentAttended(sessionId, studentId);
    if (hasAttended) {
      return {
        eligible: false,
        reason: 'Attendance already marked',
        className: session.classId.name
      };
    }

    return {
      eligible: true,
      session,
      className: session.classId.name
    };

  } catch (error) {
    console.error('Error checking attendance eligibility:', error);
    return {
      eligible: false,
      reason: 'Internal error checking eligibility'
    };
  }
}

/**
 * Verify student location against class location
 * @param {Object} studentLocation - Student's location {lat, lng}
 * @param {Object} classLocation - Class location {lat, lng}
 * @param {number} maxDistance - Maximum allowed distance in meters
 * @returns {Object} Location verification result
 */
export function verifyAttendanceLocation(studentLocation, classLocation, maxDistance = 50) {
  if (!classLocation || !classLocation.lat || !classLocation.lng) {
    return {
      valid: false,
      reason: 'Class location not configured',
      distance: null
    };
  }

  const verification = verifyLocationProximity(studentLocation, classLocation, maxDistance);
  
  return {
    valid: verification.isValid,
    reason: verification.message,
    distance: verification.distance,
    maxDistance
  };
}

/**
 * Create attendance record with validation
 * @param {Object} params - Attendance record parameters
 * @returns {Object} Creation result
 */
export async function createAttendanceRecord({
  sessionId,
  studentId,
  studentLocation,
  validateLocation = true,
  maxDistance = 50
}) {
  try {
    // Check eligibility first
    const eligibility = await checkAttendanceEligibility(sessionId, studentId);
    if (!eligibility.eligible) {
      return {
        success: false,
        error: eligibility.reason,
        className: eligibility.className
      };
    }

    // Verify location if required
    if (validateLocation) {
      const locationCheck = verifyAttendanceLocation(
        studentLocation,
        eligibility.session.classId.location,
        maxDistance
      );

      if (!locationCheck.valid) {
        return {
          success: false,
          error: locationCheck.reason,
          distance: locationCheck.distance,
          maxDistance: locationCheck.maxDistance,
          className: eligibility.className
        };
      }
    }

    // Create the attendance record
    const attendanceRecord = new AttendanceRecord({
      sessionId,
      studentId,
      studentLocation,
      markedAt: new Date()
    });

    await attendanceRecord.save();

    return {
      success: true,
      record: attendanceRecord,
      session: eligibility.session,
      distance: validateLocation ? verifyLocationProximity(
        studentLocation,
        eligibility.session.classId.location,
        maxDistance
      ).distance : null
    };

  } catch (error) {
    console.error('Error creating attendance record:', error);
    
    // Handle specific errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return {
        success: false,
        error: `Validation failed: ${errorMessages.join(', ')}`
      };
    }
    
    if (error.code === 11000) {
      return {
        success: false,
        error: 'Attendance already marked for this session'
      };
    }
    
    return {
      success: false,
      error: 'Internal error creating attendance record'
    };
  }
}

/**
 * Get attendance statistics for a student
 * @param {string} studentId - Student ID
 * @param {Object} options - Query options
 * @returns {Object} Attendance statistics
 */
export async function getStudentAttendanceStats(studentId, options = {}) {
  try {
    const { startDate, endDate, classId } = options;
    
    let records;
    if (classId) {
      records = await AttendanceRecord.findByClass(classId, startDate, endDate);
      records = records.filter(r => r.studentId.toString() === studentId);
    } else {
      records = await AttendanceRecord.findByStudent(studentId, startDate, endDate);
    }

    const totalAttendance = records.length;
    const uniqueClasses = [...new Set(records.map(r => 
      r.sessionId?.classId?._id?.toString() || r.class?._id?.toString()
    ))].length;

    // Calculate attendance by month
    const attendanceByMonth = records.reduce((acc, record) => {
      const month = record.markedAt.toISOString().substring(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    // Calculate average distance from classroom
    const distances = records
      .map(r => r.studentLocation)
      .filter(loc => loc && loc.lat && loc.lng);
    
    let averageDistance = null;
    if (distances.length > 0) {
      // This would require calculating distance for each record
      // For now, we'll just note that this data is available
      averageDistance = 'Available in individual records';
    }

    return {
      totalAttendance,
      uniqueClasses,
      attendanceByMonth,
      averageDistance,
      dateRange: {
        earliest: records.length > 0 ? records[records.length - 1].markedAt : null,
        latest: records.length > 0 ? records[0].markedAt : null
      }
    };

  } catch (error) {
    console.error('Error getting student attendance stats:', error);
    return {
      error: 'Failed to calculate attendance statistics'
    };
  }
}

/**
 * Validate attendance session before QR generation
 * @param {string} classId - Class ID
 * @param {string} teacherId - Teacher ID
 * @returns {Object} Validation result
 */
export async function validateSessionCreation(classId, teacherId) {
  try {
    // Check if teacher owns the class
    const Class = (await import('../models/Class.js')).default;
    const classDoc = await Class.findById(classId);
    
    if (!classDoc) {
      return {
        valid: false,
        error: 'Class not found'
      };
    }

    if (classDoc.teacherId.toString() !== teacherId) {
      return {
        valid: false,
        error: 'Unauthorized - You can only create sessions for your own classes'
      };
    }

    // Check if class has location configured
    if (!classDoc.location || !classDoc.location.lat || !classDoc.location.lng) {
      return {
        valid: false,
        error: 'Class location must be configured before creating attendance sessions'
      };
    }

    // Check for existing active sessions
    const existingSession = await AttendanceSession.findOne({
      classId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    return {
      valid: true,
      hasExistingSession: !!existingSession,
      existingSession,
      class: classDoc
    };

  } catch (error) {
    console.error('Error validating session creation:', error);
    return {
      valid: false,
      error: 'Internal error validating session creation'
    };
  }
}

export default {
  validateAttendanceRequest,
  checkAttendanceEligibility,
  verifyAttendanceLocation,
  createAttendanceRecord,
  getStudentAttendanceStats,
  validateSessionCreation
};