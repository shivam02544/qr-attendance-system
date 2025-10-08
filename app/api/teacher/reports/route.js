import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Class from '../../../../models/Class';
import AttendanceRecord from '../../../../models/AttendanceRecord';
import AttendanceSession from '../../../../models/AttendanceSession';

// GET endpoint to retrieve comprehensive attendance reports for all teacher's classes
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Unauthorized - Teacher access required' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const classId = searchParams.get('classId');
    const reportType = searchParams.get('type') || 'summary'; // summary, detailed, analytics
    const format = searchParams.get('format') || 'json';

    // Get teacher user
    const teacher = await User.findOne({ 
      email: session.user.email,
      role: 'teacher',
      isActive: true 
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher account not found' },
        { status: 404 }
      );
    }

    // Get teacher's classes
    let teacherClasses;
    if (classId) {
      // Verify teacher owns the specific class
      const classDoc = await Class.findById(classId);
      if (!classDoc || classDoc.teacherId.toString() !== teacher._id.toString()) {
        return NextResponse.json(
          { error: 'Class not found or unauthorized' },
          { status: 404 }
        );
      }
      teacherClasses = [classDoc];
    } else {
      teacherClasses = await Class.find({ teacherId: teacher._id });
    }

    if (teacherClasses.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'No classes found',
          classes: [],
          summary: {
            totalClasses: 0,
            totalStudents: 0,
            totalAttendanceRecords: 0,
            totalSessions: 0
          }
        }
      });
    }

    // Generate reports based on type
    let reportData;
    switch (reportType) {
      case 'detailed':
        reportData = await generateDetailedReport(teacherClasses, startDate, endDate);
        break;
      case 'analytics':
        reportData = await generateAnalyticsReport(teacherClasses, startDate, endDate);
        break;
      default:
        reportData = await generateSummaryReport(teacherClasses, startDate, endDate);
    }

    const response = {
      success: true,
      data: {
        teacher: {
          id: teacher._id,
          name: teacher.name,
          email: teacher.email
        },
        reportType,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null
        },
        generatedAt: new Date(),
        ...reportData
      }
    };

    return handleResponseFormat(response, format, reportType);

  } catch (error) {
    console.error('Error generating attendance reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Generate summary report
async function generateSummaryReport(classes, startDate, endDate) {
  const classReports = [];
  let totalStudents = 0;
  let totalAttendanceRecords = 0;
  let totalSessions = 0;

  for (const classDoc of classes) {
    const attendanceRecords = await AttendanceRecord.findByClass(classDoc._id, startDate, endDate);
    const classStats = await AttendanceRecord.getClassStats(classDoc._id, startDate, endDate);
    
    // Get total sessions for this class
    const sessions = await AttendanceSession.find({
      classId: classDoc._id,
      ...(startDate && { createdAt: { $gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { $lte: new Date(endDate) } })
    });

    const uniqueStudents = new Set(attendanceRecords.map(r => r.studentId?.toString()));
    const classStudentCount = uniqueStudents.size;
    const classSessionCount = sessions.length;
    
    classReports.push({
      classId: classDoc._id,
      className: classDoc.name,
      subject: classDoc.subject,
      totalStudents: classStudentCount,
      totalAttendanceRecords: attendanceRecords.length,
      totalSessions: classSessionCount,
      averageAttendanceRate: calculateClassAverageAttendance(classStats, classSessionCount),
      lastSessionDate: sessions.length > 0 ? sessions[sessions.length - 1].createdAt : null,
      topAttendees: classStats.slice(0, 3).map(stat => ({
        studentName: stat.studentName,
        attendanceCount: stat.attendanceCount,
        percentage: Math.round((stat.attendanceCount / classSessionCount) * 100)
      }))
    });

    totalStudents += classStudentCount;
    totalAttendanceRecords += attendanceRecords.length;
    totalSessions += classSessionCount;
  }

  return {
    summary: {
      totalClasses: classes.length,
      totalStudents,
      totalAttendanceRecords,
      totalSessions,
      averageAttendanceRate: totalSessions > 0 ? Math.round((totalAttendanceRecords / totalSessions) * 100) : 0
    },
    classes: classReports
  };
}

// Generate detailed report
async function generateDetailedReport(classes, startDate, endDate) {
  const detailedReports = [];

  for (const classDoc of classes) {
    const attendanceRecords = await AttendanceRecord.findByClass(classDoc._id, startDate, endDate);
    const classStats = await AttendanceRecord.getClassStats(classDoc._id, startDate, endDate);
    
    // Group attendance by date
    const attendanceByDate = attendanceRecords.reduce((acc, record) => {
      const date = record.markedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push({
        studentId: record.studentId,
        studentName: record.student?.name || 'Unknown',
        markedAt: record.markedAt,
        location: record.studentLocation
      });
      return acc;
    }, {});

    detailedReports.push({
      classId: classDoc._id,
      className: classDoc.name,
      subject: classDoc.subject,
      location: classDoc.location,
      studentStatistics: classStats,
      attendanceByDate,
      totalRecords: attendanceRecords.length
    });
  }

  return {
    detailedReports
  };
}

// Generate analytics report
async function generateAnalyticsReport(classes, startDate, endDate) {
  const analytics = {
    attendanceTrends: {},
    classComparison: [],
    timeAnalysis: {
      peakAttendanceHours: {},
      attendanceByDayOfWeek: {}
    }
  };

  for (const classDoc of classes) {
    const attendanceRecords = await AttendanceRecord.findByClass(classDoc._id, startDate, endDate);
    
    // Attendance trends by month
    const trendsByMonth = attendanceRecords.reduce((acc, record) => {
      const month = record.markedAt.toISOString().substring(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    analytics.attendanceTrends[classDoc.name] = trendsByMonth;

    // Time analysis
    attendanceRecords.forEach(record => {
      const hour = record.markedAt.getHours();
      const dayOfWeek = record.markedAt.getDay();
      
      analytics.timeAnalysis.peakAttendanceHours[hour] = 
        (analytics.timeAnalysis.peakAttendanceHours[hour] || 0) + 1;
      
      analytics.timeAnalysis.attendanceByDayOfWeek[dayOfWeek] = 
        (analytics.timeAnalysis.attendanceByDayOfWeek[dayOfWeek] || 0) + 1;
    });

    // Class comparison data
    const uniqueStudents = new Set(attendanceRecords.map(r => r.studentId?.toString()));
    analytics.classComparison.push({
      className: classDoc.name,
      subject: classDoc.subject,
      totalAttendance: attendanceRecords.length,
      uniqueStudents: uniqueStudents.size,
      averageAttendancePerStudent: uniqueStudents.size > 0 ? 
        Math.round(attendanceRecords.length / uniqueStudents.size) : 0
    });
  }

  return {
    analytics
  };
}

// Helper function to calculate class average attendance
function calculateClassAverageAttendance(classStats, totalSessions) {
  if (classStats.length === 0 || totalSessions === 0) return 0;
  
  const totalAttendancePercentages = classStats.reduce((sum, stat) => {
    return sum + Math.round((stat.attendanceCount / totalSessions) * 100);
  }, 0);
  
  return Math.round(totalAttendancePercentages / classStats.length);
}

// Helper function to handle different response formats
function handleResponseFormat(data, format, reportType) {
  if (format === 'csv') {
    const csv = convertReportToCSV(data, reportType);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="attendance-${reportType}-report.csv"`
      }
    });
  }
  
  return NextResponse.json(data);
}

// Helper function to convert report data to CSV
function convertReportToCSV(data, reportType) {
  if (!data.success) {
    return 'Error,No data available';
  }

  switch (reportType) {
    case 'summary':
      return convertSummaryToCSV(data.data);
    case 'detailed':
      return convertDetailedToCSV(data.data);
    case 'analytics':
      return convertAnalyticsToCSV(data.data);
    default:
      return 'Error,Unknown report type';
  }
}

function convertSummaryToCSV(data) {
  const headers = [
    'Class Name',
    'Subject',
    'Total Students',
    'Total Attendance Records',
    'Total Sessions',
    'Average Attendance Rate (%)',
    'Last Session Date'
  ];

  const rows = data.classes.map(cls => [
    cls.className,
    cls.subject,
    cls.totalStudents,
    cls.totalAttendanceRecords,
    cls.totalSessions,
    cls.averageAttendanceRate,
    cls.lastSessionDate ? new Date(cls.lastSessionDate).toLocaleDateString() : 'N/A'
  ]);

  return [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
}

function convertDetailedToCSV(data) {
  const headers = [
    'Class Name',
    'Subject',
    'Student Name',
    'Attendance Count',
    'First Attendance',
    'Last Attendance'
  ];

  const rows = [];
  data.detailedReports.forEach(report => {
    report.studentStatistics.forEach(stat => {
      rows.push([
        report.className,
        report.subject,
        stat.studentName,
        stat.attendanceCount,
        stat.firstAttendance ? new Date(stat.firstAttendance).toLocaleDateString() : 'N/A',
        stat.lastAttendance ? new Date(stat.lastAttendance).toLocaleDateString() : 'N/A'
      ]);
    });
  });

  return [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
}

function convertAnalyticsToCSV(data) {
  const headers = ['Class Name', 'Subject', 'Total Attendance', 'Unique Students', 'Avg Attendance Per Student'];
  
  const rows = data.analytics.classComparison.map(cls => [
    cls.className,
    cls.subject,
    cls.totalAttendance,
    cls.uniqueStudents,
    cls.averageAttendancePerStudent
  ]);

  return [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
}