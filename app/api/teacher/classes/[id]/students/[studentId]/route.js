import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../auth/[...nextauth]/route';
import dbConnect from '../../../../../../../lib/mongodb';
import Class from '../../../../../../../models/Class';
import Enrollment from '../../../../../../../models/Enrollment';

// DELETE /api/teacher/classes/[id]/students/[studentId] - Remove a student from class
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id, studentId } = await params;

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

    // Find the enrollment
    const enrollment = await Enrollment.findOne({
      classId: id,
      studentId: studentId,
      isActive: true
    });

    if (!enrollment) {
      return NextResponse.json(
        { message: 'Student is not enrolled in this class' },
        { status: 404 }
      );
    }

    // Deactivate the enrollment instead of deleting it (for audit trail)
    enrollment.isActive = false;
    await enrollment.save();

    return NextResponse.json({
      success: true,
      message: 'Student removed from class successfully'
    });

  } catch (error) {
    console.error('Error removing student from class:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}