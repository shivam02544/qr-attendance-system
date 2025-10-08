import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../auth/[...nextauth]/route';
import dbConnect from '../../../../../../../lib/mongodb';
import User from '../../../../../../../models/User';
import Class from '../../../../../../../models/Class';
import { generateStudentAttendanceReport, exportAttendanceData } from '../../../../../../../lib/attendanceReports';

// GET endpoint to retrieve individual student attendance for a specific class
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
    const studentId = searchParams.get('studentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json';

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

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

    // Verify teacher owns the class
    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.teacherId.toString() !== teacher._id.toString()) {
      return NextResponse.json(
        { error: 'Class not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Generate student attendance report for this specific class
    const reportResult = await generateStudentAttendanceReport(
      studentId,
      classId,
      { startDate, endDate }
    );

    if (!reportResult.success) {
      return NextResponse.json(
        { error: reportResult.error },
        { status: 500 }
      );
    }

    const reportData = reportResult.report;

    // Calculate attendance rate for this specific class
    const classAttendance = reportData.statistics.attendanceByClass.find(
      cls => cls.classId.toString() === classId
    );

    // Get total sessions for this class to calculate attendance rate
    const AttendanceSession = (await import('../../../../../../../models/AttendanceSession')).default;
    const totalSessions = await AttendanceSession.countDocuments({
      classId,
      ...(startDate && { createdAt: { $gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { $lte: new Date(endDate) } })
    });

    const attendanceRate = totalSessions > 0 && classAttendance ? 
      Math.round((classAttendance.attendanceCount / totalSessions) * 100) : 0;

    // Format response data
    const responseData = {
      success: true,
      data: {
        student: reportData.student,
        class: {
          id: classDoc._id,
          name: classDoc.name,
          subject: classDoc.subject
        },
        dateRange: reportData.dateRange,
        statistics: {
          totalAttendance: classAttendance?.attendanceCount || 0,
          attendanceRate,
          lastAttendance: classAttendance?.lastAttendance || null,
          totalSessions
        },
        attendanceHistory: reportData.attendanceHistory.filter(record => 
          record.className === classDoc.name
        ),
        patterns: reportData.patterns,
        generatedAt: reportData.generatedAt
      }
    };

    // Handle different response formats
    if (format === 'csv') {
      const exportResult = exportAttendanceData(reportResult, 'csv');
      
      if (!exportResult.success) {
        return NextResponse.json(
          { error: exportResult.error },
          { status: 500 }
        );
      }

      return new NextResponse(exportResult.data, {
        headers: {
          'Content-Type': exportResult.contentType,
          'Content-Disposition': `attachment; filename="student-${student.name}-${classDoc.name}-attendance.csv"`
        }
      });
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}