import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import dbConnect from '../../../../../../lib/mongodb';
import Class from '../../../../../../models/Class';
import Enrollment from '../../../../../../models/Enrollment';

// GET /api/teacher/classes/[id]/students - Get all students enrolled in a class
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Await params in Next.js 15
    const { id } = await params;

    // Verify the class belongs to this teacher
    const classItem = await Class.findOne({
      _id: id,
      teacherId: session.user.id
    });

    if (!classItem) {
      return NextResponse.json(
        { message: 'Class not found' },
        { status: 404 }
      );
    }

    // Get all active enrollments for this class
    const enrollments = await Enrollment.find({
      classId: id,
      isActive: true
    })
    .populate('studentId', 'name email')
    .sort({ enrolledAt: -1 });

    // Format the response to include student info and enrollment date
    const students = enrollments.map(enrollment => ({
      _id: enrollment.studentId._id,
      name: enrollment.studentId.name,
      email: enrollment.studentId.email,
      enrolledAt: enrollment.enrolledAt,
      enrollmentId: enrollment._id
    }));

    return NextResponse.json({
      success: true,
      students,
      count: students.length
    });

  } catch (error) {
    console.error('Error fetching class students:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}