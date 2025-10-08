import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '../../../../../lib/mongodb';
import Class from '../../../../../models/Class';
import Enrollment from '../../../../../models/Enrollment';
import AttendanceSession from '../../../../../models/AttendanceSession';
import AttendanceRecord from '../../../../../models/AttendanceRecord';

// GET /api/teacher/classes/[id] - Get specific class details
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

    const classItem = await Class.findOne({
      _id: id,
      teacherId: session.user.id
    }).populate('teacherId', 'name email');

    if (!classItem) {
      return NextResponse.json(
        { message: 'Class not found' },
        { status: 404 }
      );
    }

    // Get enrollment count
    const enrollmentCount = await Enrollment.countDocuments({
      classId: classItem._id,
      isActive: true
    });

    return NextResponse.json({
      success: true,
      class: {
        ...classItem.toObject(),
        enrollmentCount
      }
    });

  } catch (error) {
    console.error('Error fetching class details:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/teacher/classes/[id] - Update class details
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, subject, location } = body;

    // Validation
    if (!name || !subject || !location) {
      return NextResponse.json(
        { message: 'Name, subject, and location are required' },
        { status: 400 }
      );
    }

    if (!location.name || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return NextResponse.json(
        { message: 'Location must include name, latitude, and longitude' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Await params in Next.js 15
    const { id } = await params;

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

    // Check if another class with the same name exists (excluding current class)
    const existingClass = await Class.findOne({
      teacherId: session.user.id,
      name: name.trim(),
      _id: { $ne: id }
    });

    if (existingClass) {
      return NextResponse.json(
        { message: 'You already have another class with this name' },
        { status: 400 }
      );
    }

    // Update the class
    classItem.name = name.trim();
    classItem.subject = subject.trim();
    classItem.location = {
      name: location.name.trim(),
      lat: location.lat,
      lng: location.lng
    };

    await classItem.save();
    await classItem.populate('teacherId', 'name email');

    return NextResponse.json({
      success: true,
      message: 'Class updated successfully',
      class: classItem.toObject()
    });

  } catch (error) {
    console.error('Error updating class:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { message: messages.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/teacher/classes/[id] - Delete a class
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

    // Await params in Next.js 15
    const { id } = await params;

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

    // Delete related data in order (to maintain referential integrity)
    // 1. Delete attendance records for this class
    const sessions = await AttendanceSession.find({ classId: id });
    const sessionIds = sessions.map(session => session._id);
    
    if (sessionIds.length > 0) {
      await AttendanceRecord.deleteMany({ sessionId: { $in: sessionIds } });
    }

    // 2. Delete attendance sessions
    await AttendanceSession.deleteMany({ classId: id });

    // 3. Delete enrollments
    await Enrollment.deleteMany({ classId: id });

    // 4. Finally delete the class
    await Class.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Class and all related data deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}