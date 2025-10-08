import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb.js';
import Class from '../../../../models/Class';
import User from '../../../../models/User';
import Enrollment from '../../../../models/Enrollment';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search');
    const teacherId = searchParams.get('teacherId');

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }
    if (teacherId) {
      query.teacherId = teacherId;
    }

    // Get total count for pagination
    const total = await Class.countDocuments(query);

    // Get classes with teacher information and enrollment count
    const classes = await Class.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher'
        }
      },
      {
        $lookup: {
          from: 'enrollments',
          let: { classId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$classId', '$$classId'] },
                    { $eq: ['$isActive', true] }
                  ]
                }
              }
            }
          ],
          as: 'enrollments'
        }
      },
      {
        $addFields: {
          teacher: { $arrayElemAt: ['$teacher', 0] },
          enrollmentCount: { $size: '$enrollments' }
        }
      },
      {
        $project: {
          name: 1,
          subject: 1,
          location: 1,
          createdAt: 1,
          updatedAt: 1,
          enrollmentCount: 1,
          'teacher.name': 1,
          'teacher.email': 1,
          'teacher._id': 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]);

    return NextResponse.json({
      classes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get classes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}