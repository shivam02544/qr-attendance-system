import { NextResponse } from 'next/server';
import { withAuth } from '../../../../lib/auth';

async function handler(request) {
  const user = request.session.user;
  
  return NextResponse.json({
    message: 'This is a student-only route',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
}

// Protect this route - only students can access
export const GET = withAuth(handler, ['student']);