import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import dbConnect from '../../../../../../lib/mongodb';
import User from '../../../../../../models/User';
import Class from '../../../../../../models/Class';
import AttendanceRecord from '../../../../../../models/AttendanceRecord';
import Enrollment from '../../../../../../models/Enrollment';

// GET endpoint to retrieve attendance reports for a specific class
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Unauthorized - Teacher access required' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id: classId } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json'; // json, csv
    const includeDetails = searchParams.get('includeDetails') === 'true';
    const studentId = searchParams.get('studentId'); // For individual student reports

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

    // Verify teacher owns this class
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    if (classDoc.teacherId.toString() !== teacher._id.toString()) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only view reports for your own classes' },
        { status: 403 }
      );
    }

    // Get attendance records for the class
    const attendanceRecords = await AttendanceRecord.findByClass(classId, startDate, endDate);
    
    // Get enrolled students for the class
    const enrolledStudents = await Enrollment.find({ 
      classId, 
      isActive: true 
    }).populate('studentId', 'name email');

    // If requesting individual student report
    if (studentId) {
      const studentRecords = attendanceRecords.filter(record => 
        record.studentId.toString() === studentId
      );
      
      const student = enrolledStudents.find(enrollment => 
        enrollment.studentId._id.toString() === studentId
      );

      if (!student) {
        return NextResponse.json(
          { error: 'Student not found in this class' },
          { status: 404 }
        );
      }

      const response = {
        success: true,
        data: {
          student: {
            id: student.studentId._id,
            name: student.studentId.name,
            email: student.studentId.email
          },
          class: {
            id: classDoc._id,
            name: classDoc.name,
            subject: classDoc.subject
          },
          attendanceRecords: studentRecords,
          statistics: {
            totalAttendance: studentRecords.length,
            dateRange: {
              startDate: startDate || null,
              endDate: endDate || null
            }
          }
        }
      };

      return handleResponseFormat(response, format);
    }

    // Generate comprehensive class report
    const classStats = await AttendanceRecord.getClassStats(classId, startDate, endDate);
    
    // Create attendance summary by student
    const attendanceSummary = enrolledStudents.map(enrollment => {
      const student = enrollment.studentId;
      const studentAttendance = attendanceRecords.filter(record => 
        record.studentId.toString() === student._id.toString()
      );
      
      const stats = classStats.find(stat => 
        stat.studentId.toString() === student._id.toString()
      );

      return {
        studentId: student._id,
        studentName: student.name,
        studentEmail: student.email,
        attendanceCount: stats ? stats.attendanceCount : 0,
        lastAttendance: stats ? stats.lastAttendance : null,
        firstAttendance: stats ? stats.firstAttendance : null,
        attendancePercentage: calculateAttendancePercentage(
          stats ? stats.attendanceCount : 0,
          getTotalSessions(attendanceRecords)
        ),
        recentAttendance: studentAttendance.slice(0, 5) // Last 5 attendance records
      };
    });

    const response = {
      success: true,
      data: {
        class: {
          id: classDoc._id,
          name: classDoc.name,
          subject: classDoc.subject,
          location: classDoc.location
        },
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null
        },
        summary: {
          totalStudents: enrolledStudents.length,
          totalAttendanceRecords: attendanceRecords.length,
          totalSessions: getTotalSessions(attendanceRecords),
          averageAttendanceRate: calculateAverageAttendanceRate(attendanceSummary)
        },
        students: attendanceSummary,
        ...(includeDetails && {
          detailedRecords: attendanceRecords
        })
      }
    };

    return handleResponseFormat(response, format);

  } catch (error) {
    console.error('Error fetching attendance report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to handle different response formats
function handleResponseFormat(data, format) {
  if (format === 'csv') {
    const csv = convertToCSV(data);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="attendance-report.csv"'
      }
    });
  }
  
  return NextResponse.json(data);
}

// Helper function to convert data to CSV format
function convertToCSV(data) {
  if (!data.success || !data.data.students) {
    return 'Error,No data available';
  }

  const headers = [
    'Student Name',
    'Student Email', 
    'Attendance Count',
    'Attendance Percentage',
    'First Attendance',
    'Last Attendance'
  ];

  const rows = data.data.students.map(student => [
    student.studentName,
    student.studentEmail,
    student.attendanceCount,
    `${student.attendancePercentage}%`,
    student.firstAttendance ? new Date(student.firstAttendance).toLocaleDateString() : 'N/A',
    student.lastAttendance ? new Date(student.lastAttendance).toLocaleDateString() : 'N/A'
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
}

// Helper function to calculate attendance percentage
function calculateAttendancePercentage(attendanceCount, totalSessions) {
  if (totalSessions === 0) return 0;
  return Math.round((attendanceCount / totalSessions) * 100);
}

// Helper function to get total unique sessions
function getTotalSessions(attendanceRecords) {
  const uniqueSessions = new Set(
    attendanceRecords.map(record => record.sessionId?.toString() || record.session?._id?.toString())
  );
  return uniqueSessions.size;
}

// Helper function to calculate average attendance rate
function calculateAverageAttendanceRate(attendanceSummary) {
  if (attendanceSummary.length === 0) return 0;
  
  const totalPercentage = attendanceSummary.reduce(
    (sum, student) => sum + student.attendancePercentage, 
    0
  );
  
  return Math.round(totalPercentage / attendanceSummary.length);
}