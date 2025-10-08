import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
import Class from '../../../../models/Class';
import Enrollment from '../../../../models/Enrollment';

// GET /api/student/classes - Get available classes for enrollment
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'student') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Get all classes
    const allClasses = await Class.find({})
      .populate('teacherId', 'name email')
      .sort({ createdAt: -1 });

    // Debug: Log classes with missing teacher data
    allClasses.forEach(cls => {
      if (!cls.teacherId) {
        console.warn(`Class ${cls._id} (${cls.name}) has no teacher assigned`);
      }
    });

    // Get student's current enrollments
    const studentEnrollments = await Enrollment.find({
      studentId: session.user.id,
      isActive: true
    }).select('classId');

    const enrolledClassIds = studentEnrollments.map(enrollment => 
      enrollment.classId.toString()
    );

    // Add enrollment status and count to each class
    const classesWithStatus = await Promise.all(
      allClasses.map(async (classItem) => {
        const enrollmentCount = await Enrollment.countDocuments({
          classId: classItem._id,
          isActive: true
        });
        
        const isEnrolled = enrolledClassIds.includes(classItem._id.toString());
        
        return {
          ...classItem.toObject(),
          enrollmentCount,
          isEnrolled
        };
      })
    );

    return NextResponse.json({
      success: true,
      classes: classesWithStatus
    });

  } catch (error) {
    console.error('Error fetching classes for student:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}