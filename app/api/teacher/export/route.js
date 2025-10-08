import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Class from '../../../../models/Class';
import { generateClassAttendanceReport, exportAttendanceData } from '../../../../lib/attendanceReports';

// GET endpoint to export attendance data in various formats
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
    const classId = searchParams.get('classId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'csv';
    const includeDetails = searchParams.get('includeDetails') === 'true';

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
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

    // Generate comprehensive attendance report
    const reportResult = await generateClassAttendanceReport(classId, {
      startDate,
      endDate,
      includeIndividualRecords: includeDetails
    });

    if (!reportResult.success) {
      return NextResponse.json(
        { error: reportResult.error },
        { status: 500 }
      );
    }

    // Export data in requested format
    const exportResult = exportAttendanceData(reportResult, format);

    if (!exportResult.success) {
      return NextResponse.json(
        { error: exportResult.error },
        { status: 500 }
      );
    }

    // Return file with appropriate headers
    return new NextResponse(exportResult.data, {
      headers: {
        'Content-Type': exportResult.contentType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`
      }
    });

  } catch (error) {
    console.error('Error exporting attendance data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}