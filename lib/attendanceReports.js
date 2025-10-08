/**
 * Attendance reporting and data aggregation utilities
 */

import AttendanceRecord from '../models/AttendanceRecord.js';
import AttendanceSession from '../models/AttendanceSession.js';
import Enrollment from '../models/Enrollment.js';
import Class from '../models/Class.js';
import User from '../models/User.js';

/**
 * Generate comprehensive attendance report for a class
 * @param {string} classId - Class ID
 * @param {Object} options - Report options
 * @returns {Object} Comprehensive attendance report
 */
export async function generateClassAttendanceReport(classId, options = {}) {
  try {
    const { startDate, endDate, includeIndividualRecords = false } = options;

    // Get class information
    const classDoc = await Class.findById(classId).populate('teacherId', 'name email');
    if (!classDoc) {
      throw new Error('Class not found');
    }

    // Get attendance records for the date range
    const attendanceRecords = await AttendanceRecord.findByClass(classId, startDate, endDate);
    
    // Get all sessions for this class in the date range
    const sessionsQuery = { classId };
    if (startDate || endDate) {
      sessionsQuery.createdAt = {};
      if (startDate) sessionsQuery.createdAt.$gte = new Date(startDate);
      if (endDate) sessionsQuery.createdAt.$lte = new Date(endDate);
    }
    const sessions = await AttendanceSession.find(sessionsQuery).sort({ createdAt: -1 });

    // Get enrolled students
    const enrollments = await Enrollment.find({ classId, isActive: true })
      .populate('studentId', 'name email');

    // Calculate statistics
    const stats = await calculateClassStatistics(classId, attendanceRecords, sessions, enrollments);
    
    // Generate student-wise attendance summary
    const studentSummaries = await generateStudentAttendanceSummaries(
      enrollments, 
      attendanceRecords, 
      sessions.length
    );

    // Generate session-wise attendance summary
    const sessionSummaries = await generateSessionAttendanceSummaries(sessions, attendanceRecords);

    const report = {
      class: {
        id: classDoc._id,
        name: classDoc.name,
        subject: classDoc.subject,
        location: classDoc.location,
        teacher: {
          id: classDoc.teacherId._id,
          name: classDoc.teacherId.name,
          email: classDoc.teacherId.email
        }
      },
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      statistics: stats,
      studentSummaries,
      sessionSummaries,
      generatedAt: new Date()
    };

    if (includeIndividualRecords) {
      report.individualRecords = attendanceRecords;
    }

    return {
      success: true,
      report
    };

  } catch (error) {
    console.error('Error generating class attendance report:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate individual student attendance report
 * @param {string} studentId - Student ID
 * @param {string} classId - Class ID (optional)
 * @param {Object} options - Report options
 * @returns {Object} Student attendance report
 */
export async function generateStudentAttendanceReport(studentId, classId = null, options = {}) {
  try {
    const { startDate, endDate } = options;

    // Get student information
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      throw new Error('Student not found');
    }

    let attendanceRecords;
    let enrolledClasses;

    if (classId) {
      // Report for specific class
      attendanceRecords = await AttendanceRecord.findByClass(classId, startDate, endDate);
      attendanceRecords = attendanceRecords.filter(record => 
        record.studentId.toString() === studentId
      );
      
      const classDoc = await Class.findById(classId).populate('teacherId', 'name');
      enrolledClasses = [classDoc];
    } else {
      // Report for all classes
      attendanceRecords = await AttendanceRecord.findByStudent(studentId, startDate, endDate);
      
      // Get all classes the student is enrolled in
      const enrollments = await Enrollment.find({ studentId, isActive: true })
        .populate('classId');
      enrolledClasses = enrollments.map(e => e.classId);
    }

    // Calculate student statistics
    const stats = await calculateStudentStatistics(studentId, attendanceRecords, enrolledClasses);

    // Generate attendance patterns
    const patterns = analyzeAttendancePatterns(attendanceRecords);

    const report = {
      student: {
        id: student._id,
        name: student.name,
        email: student.email
      },
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      statistics: stats,
      patterns,
      attendanceHistory: attendanceRecords.map(record => ({
        id: record._id,
        className: record.session?.classId?.name || record.class?.name,
        subject: record.session?.classId?.subject || record.class?.subject,
        markedAt: record.markedAt,
        location: record.studentLocation,
        sessionDate: record.session?.createdAt || record.markedAt
      })),
      generatedAt: new Date()
    };

    return {
      success: true,
      report
    };

  } catch (error) {
    console.error('Error generating student attendance report:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate comprehensive class statistics
 */
async function calculateClassStatistics(classId, attendanceRecords, sessions, enrollments) {
  const totalStudents = enrollments.length;
  const totalSessions = sessions.length;
  const totalAttendanceRecords = attendanceRecords.length;
  
  // Calculate attendance rate
  const expectedAttendance = totalStudents * totalSessions;
  const attendanceRate = expectedAttendance > 0 ? 
    Math.round((totalAttendanceRecords / expectedAttendance) * 100) : 0;

  // Find most and least attended sessions
  const sessionAttendance = sessions.map(session => {
    const sessionRecords = attendanceRecords.filter(record => 
      record.sessionId?.toString() === session._id.toString()
    );
    return {
      sessionId: session._id,
      date: session.createdAt,
      attendanceCount: sessionRecords.length,
      attendanceRate: totalStudents > 0 ? 
        Math.round((sessionRecords.length / totalStudents) * 100) : 0
    };
  });

  const mostAttendedSession = sessionAttendance.reduce((max, session) => 
    session.attendanceCount > (max?.attendanceCount || 0) ? session : max, null);
  
  const leastAttendedSession = sessionAttendance.reduce((min, session) => 
    session.attendanceCount < (min?.attendanceCount || Infinity) ? session : min, null);

  // Calculate attendance trends by week
  const weeklyTrends = calculateWeeklyTrends(attendanceRecords);

  return {
    totalStudents,
    totalSessions,
    totalAttendanceRecords,
    attendanceRate,
    averageAttendancePerSession: totalSessions > 0 ? 
      Math.round(totalAttendanceRecords / totalSessions) : 0,
    mostAttendedSession,
    leastAttendedSession,
    weeklyTrends,
    sessionAttendanceDistribution: sessionAttendance
  };
}

/**
 * Generate student attendance summaries
 */
async function generateStudentAttendanceSummaries(enrollments, attendanceRecords, totalSessions) {
  return enrollments.map(enrollment => {
    const student = enrollment.studentId;
    const studentRecords = attendanceRecords.filter(record => 
      record.studentId.toString() === student._id.toString()
    );

    const attendanceCount = studentRecords.length;
    const attendanceRate = totalSessions > 0 ? 
      Math.round((attendanceCount / totalSessions) * 100) : 0;

    // Calculate streak information
    const streakInfo = calculateAttendanceStreak(studentRecords);

    return {
      studentId: student._id,
      studentName: student.name,
      studentEmail: student.email,
      attendanceCount,
      attendanceRate,
      firstAttendance: studentRecords.length > 0 ? 
        studentRecords[studentRecords.length - 1].markedAt : null,
      lastAttendance: studentRecords.length > 0 ? 
        studentRecords[0].markedAt : null,
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      recentAttendance: studentRecords.slice(0, 5)
    };
  });
}

/**
 * Generate session attendance summaries
 */
async function generateSessionAttendanceSummaries(sessions, attendanceRecords) {
  return sessions.map(session => {
    const sessionRecords = attendanceRecords.filter(record => 
      record.sessionId?.toString() === session._id.toString()
    );

    return {
      sessionId: session._id,
      sessionToken: session.sessionToken,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isActive: session.isActive,
      attendanceCount: sessionRecords.length,
      attendees: sessionRecords.map(record => ({
        studentId: record.studentId,
        studentName: record.student?.name || 'Unknown',
        markedAt: record.markedAt,
        location: record.studentLocation
      }))
    };
  });
}

/**
 * Calculate individual student statistics
 */
async function calculateStudentStatistics(studentId, attendanceRecords, enrolledClasses) {
  const totalClasses = enrolledClasses.length;
  const totalAttendance = attendanceRecords.length;
  
  // Calculate attendance by class
  const attendanceByClass = enrolledClasses.map(classDoc => {
    const classAttendance = attendanceRecords.filter(record => 
      (record.session?.classId?._id?.toString() || record.class?._id?.toString()) === classDoc._id.toString()
    );
    
    return {
      classId: classDoc._id,
      className: classDoc.name,
      subject: classDoc.subject,
      attendanceCount: classAttendance.length,
      lastAttendance: classAttendance.length > 0 ? classAttendance[0].markedAt : null
    };
  });

  // Calculate monthly attendance
  const monthlyAttendance = attendanceRecords.reduce((acc, record) => {
    const month = record.markedAt.toISOString().substring(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  return {
    totalClasses,
    totalAttendance,
    averageAttendancePerClass: totalClasses > 0 ? 
      Math.round(totalAttendance / totalClasses) : 0,
    attendanceByClass,
    monthlyAttendance,
    mostActiveClass: attendanceByClass.reduce((max, cls) => 
      cls.attendanceCount > (max?.attendanceCount || 0) ? cls : max, null)
  };
}

/**
 * Analyze attendance patterns
 */
function analyzeAttendancePatterns(attendanceRecords) {
  if (attendanceRecords.length === 0) {
    return {
      attendanceByDayOfWeek: {},
      attendanceByHour: {},
      attendanceFrequency: 'No data'
    };
  }

  // Attendance by day of week
  const attendanceByDayOfWeek = attendanceRecords.reduce((acc, record) => {
    const dayOfWeek = record.markedAt.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];
    acc[dayName] = (acc[dayName] || 0) + 1;
    return acc;
  }, {});

  // Attendance by hour
  const attendanceByHour = attendanceRecords.reduce((acc, record) => {
    const hour = record.markedAt.getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  // Calculate attendance frequency
  const totalDays = Math.ceil(
    (new Date() - new Date(attendanceRecords[attendanceRecords.length - 1].markedAt)) / (1000 * 60 * 60 * 24)
  );
  const attendanceFrequency = totalDays > 0 ? 
    `${Math.round((attendanceRecords.length / totalDays) * 7)} times per week` : 'Daily';

  return {
    attendanceByDayOfWeek,
    attendanceByHour,
    attendanceFrequency,
    mostActiveDay: Object.keys(attendanceByDayOfWeek).reduce((a, b) => 
      attendanceByDayOfWeek[a] > attendanceByDayOfWeek[b] ? a : b, 'Monday'),
    mostActiveHour: Object.keys(attendanceByHour).reduce((a, b) => 
      attendanceByHour[a] > attendanceByHour[b] ? a : b, '9')
  };
}

/**
 * Calculate weekly attendance trends
 */
function calculateWeeklyTrends(attendanceRecords) {
  const weeklyData = {};
  
  attendanceRecords.forEach(record => {
    const weekStart = getWeekStart(record.markedAt);
    const weekKey = weekStart.toISOString().split('T')[0];
    weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
  });

  return Object.keys(weeklyData)
    .sort()
    .map(weekKey => ({
      weekStart: weekKey,
      attendanceCount: weeklyData[weekKey]
    }));
}

/**
 * Calculate attendance streak information
 */
function calculateAttendanceStreak(attendanceRecords) {
  if (attendanceRecords.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort records by date (newest first)
  const sortedRecords = [...attendanceRecords].sort((a, b) => b.markedAt - a.markedAt);
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  // This is a simplified streak calculation
  // In a real implementation, you'd want to consider consecutive class days
  for (let i = 0; i < sortedRecords.length; i++) {
    tempStreak++;
    if (i === 0) {
      currentStreak = 1;
    }
    
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  return { currentStreak, longestStreak };
}

/**
 * Get the start of the week for a given date
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

/**
 * Export attendance data to different formats
 * @param {Object} reportData - Report data to export
 * @param {string} format - Export format (csv, json, xlsx)
 * @returns {Object} Export result
 */
export function exportAttendanceData(reportData, format = 'csv') {
  try {
    switch (format.toLowerCase()) {
      case 'csv':
        return {
          success: true,
          data: convertToCSV(reportData),
          contentType: 'text/csv',
          filename: `attendance-report-${new Date().toISOString().split('T')[0]}.csv`
        };
      case 'json':
        return {
          success: true,
          data: JSON.stringify(reportData, null, 2),
          contentType: 'application/json',
          filename: `attendance-report-${new Date().toISOString().split('T')[0]}.json`
        };
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Convert report data to CSV format
 */
function convertToCSV(reportData) {
  if (!reportData.success || !reportData.report) {
    return 'Error,No data available';
  }

  const report = reportData.report;
  
  if (report.studentSummaries) {
    // Class report format
    const headers = [
      'Student Name',
      'Student Email',
      'Attendance Count',
      'Attendance Rate (%)',
      'First Attendance',
      'Last Attendance',
      'Current Streak',
      'Longest Streak'
    ];

    const rows = report.studentSummaries.map(student => [
      student.studentName,
      student.studentEmail,
      student.attendanceCount,
      student.attendanceRate,
      student.firstAttendance ? new Date(student.firstAttendance).toLocaleDateString() : 'N/A',
      student.lastAttendance ? new Date(student.lastAttendance).toLocaleDateString() : 'N/A',
      student.currentStreak,
      student.longestStreak
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  } else if (report.attendanceHistory) {
    // Student report format
    const headers = [
      'Class Name',
      'Subject',
      'Attendance Date',
      'Attendance Time',
      'Location (Lat)',
      'Location (Lng)'
    ];

    const rows = report.attendanceHistory.map(record => [
      record.className,
      record.subject,
      new Date(record.markedAt).toLocaleDateString(),
      new Date(record.markedAt).toLocaleTimeString(),
      record.location?.lat || 'N/A',
      record.location?.lng || 'N/A'
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  return 'Error,Unknown report format';
}

export default {
  generateClassAttendanceReport,
  generateStudentAttendanceReport,
  exportAttendanceData
};