import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'No session found',
        session: null,
        user: null
      });
    }

    await dbConnect();

    // Try to find the user in the database
    let dbUser = null;
    let userError = null;
    
    try {
      dbUser = await User.findById(session.user.id);
    } catch (error) {
      userError = error.message;
    }

    return NextResponse.json({
      success: true,
      session: {
        user: session.user,
        expires: session.expires
      },
      dbUser: dbUser ? {
        id: dbUser._id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        isActive: dbUser.isActive,
        createdAt: dbUser.createdAt
      } : null,
      userError,
      debug: {
        sessionUserId: session.user.id,
        sessionUserIdType: typeof session.user.id,
        dbUserExists: !!dbUser,
        dbUserRole: dbUser?.role,
        dbUserActive: dbUser?.isActive
      }
    });

  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}