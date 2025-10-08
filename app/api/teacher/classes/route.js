import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
import Class from '../../../../models/Class';
import Enrollment from '../../../../models/Enrollment';

// GET /api/teacher/classes - Get all classes for the authenticated teacher
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Find all classes for this teacher
    const classes = await Class.find({ teacherId: session.user.id })
      .populate('teacherId', 'name email')
      .sort({ createdAt: -1 });

    // Get enrollment counts for each class
    const classesWithCounts = await Promise.all(
      classes.map(async (classItem) => {
        const enrollmentCount = await Enrollment.countDocuments({
          classId: classItem._id,
          isActive: true
        });
        
        return {
          ...classItem.toObject(),
          enrollmentCount
        };
      })
    );

    return NextResponse.json({
      success: true,
      classes: classesWithCounts
    });

  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/teacher/classes - Create a new class
export async function POST(request) {
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

    if (location.lat < -90 || location.lat > 90) {
      return NextResponse.json(
        { message: 'Latitude must be between -90 and 90' },
        { status: 400 }
      );
    }

    if (location.lng < -180 || location.lng > 180) {
      return NextResponse.json(
        { message: 'Longitude must be between -180 and 180' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if teacher already has a class with this name
    const existingClass = await Class.findOne({
      teacherId: session.user.id,
      name: name.trim()
    });

    if (existingClass) {
      return NextResponse.json(
        { message: 'You already have a class with this name' },
        { status: 400 }
      );
    }

    // Create the class
    const newClass = new Class({
      name: name.trim(),
      subject: subject.trim(),
      teacherId: session.user.id,
      location: {
        name: location.name.trim(),
        lat: location.lat,
        lng: location.lng
      }
    });

    await newClass.save();

    // Populate teacher info for response
    await newClass.populate('teacherId', 'name email');

    return NextResponse.json({
      success: true,
      message: 'Class created successfully',
      class: {
        ...newClass.toObject(),
        enrollmentCount: 0
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating class:', error);
    
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