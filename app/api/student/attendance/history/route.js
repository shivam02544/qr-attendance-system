import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import { generateStudentAttendanceReport, exportAttendanceData } from '../../../../../lib/attendanceReports';

// GET endpoint to retrieve student's attendance history and analytics
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Unauthorized - Student access required' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const classId = searchParams.get('classId');
    const format = searchParams.get('format') || 'json';

    // Get student user
    const student = await User.findOne({ 
      email: session.user.email,
      role: 'student',
      isActive: true 
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student account not found' },
        { status: 404 }
      );
    }

    // Generate student attendance report
    const reportResult = await generateStudentAttendanceReport(
      student._id.toString(),
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

    // Format response data
    const responseData = {
      success: true,
      data: {
        student: reportData.student,
        dateRange: reportData.dateRange,
        summary: reportData.statistics,
        attendanceHistory: reportData.attendanceHistory,
        attendanceByClass: reportData.statistics.attendanceByClass,
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
          'Content-Disposition': `attachment; filename="${exportResult.filename}"`
        }
      });
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching student attendance history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}