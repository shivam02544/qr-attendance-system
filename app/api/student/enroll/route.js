import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
import Class from '../../../../models/Class';
import Enrollment from '../../../../models/Enrollment';

// POST /api/student/enroll - Enroll in a class
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'student') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { classId } = body;

    // Validation
    if (!classId) {
      return NextResponse.json(
        { message: 'Class ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return NextResponse.json(
        { message: 'Class not found' },
        { status: 404 }
      );
    }

    // Check if student is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      studentId: session.user.id,
      classId: classId,
      isActive: true
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { message: 'You are already enrolled in this class' },
        { status: 400 }
      );
    }

    // Create new enrollment
    const newEnrollment = new Enrollment({
      studentId: session.user.id,
      classId: classId
    });

    try {
      await newEnrollment.save();
    } catch (saveError) {
      console.error('Enrollment save error:', saveError);
      
      // Handle specific validation errors from pre-save hooks
      if (saveError.message === 'Student not found') {
        return NextResponse.json(
          { 
            message: 'Your user account was not found. Please try logging out and logging back in.',
            debug: {
              sessionUserId: session.user.id,
              error: 'Student not found in database'
            }
          },
          { status: 400 }
        );
      }
      
      if (saveError.message === 'Only students can be enrolled in classes') {
        return NextResponse.json(
          { 
            message: 'Only student accounts can enroll in classes. Your account role is: ' + session.user.role,
            debug: {
              sessionUserRole: session.user.role,
              error: 'Invalid user role for enrollment'
            }
          },
          { status: 403 }
        );
      }
      
      if (saveError.message === 'Cannot enroll inactive student') {
        return NextResponse.json(
          { 
            message: 'Your account is inactive. Please contact an administrator.',
            debug: {
              error: 'User account is inactive'
            }
          },
          { status: 403 }
        );
      }
      
      // Re-throw other errors to be handled by the outer catch block
      throw saveError;
    }

    // Populate the enrollment with class and student details
    await newEnrollment.populate([
      { path: 'classId', select: 'name subject location' },
      { path: 'studentId', select: 'name email' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Successfully enrolled in class',
      enrollment: newEnrollment
    }, { status: 201 });

  } catch (error) {
    console.error('Error enrolling in class:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { message: messages.join(', ') },
        { status: 400 }
      );
    }

    // Handle duplicate key error (unique constraint violation)
    if (error.code === 11000) {
      return NextResponse.json(
        { message: 'You are already enrolled in this class' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}