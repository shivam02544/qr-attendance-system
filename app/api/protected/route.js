import { NextResponse } from 'next/server';
import { withAuth } from '../../../lib/auth';

async function handler(request) {
  // This route is protected and only accessible to authenticated users
  const user = request.session.user;
  
  return NextResponse.json({
    message: 'This is a protected route',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
}

// Protect this route - only authenticated users can access
export const GET = withAuth(handler);
export const POST = withAuth(handler);