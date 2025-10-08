import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../app/api/auth/[...nextauth]/route';

/**
 * Get the current session on the server side
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Middleware to protect API routes
 * @param {Request} request - The incoming request
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 * @returns {Object|null} - Returns error response if unauthorized, null if authorized
 */
export async function requireAuth(request, allowedRoles = []) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user role is allowed
    if (allowedRoles.length > 0 && !allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return null; // No error, user is authorized
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

/**
 * Higher-order function to wrap API route handlers with authentication
 * @param {Function} handler - The API route handler
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 * @returns {Function} - Wrapped handler function
 */
export function withAuth(handler, allowedRoles = []) {
  return async function(request, context) {
    const authError = await requireAuth(request, allowedRoles);
    
    if (authError) {
      return authError;
    }

    // Add session to the request context
    const session = await getSession();
    request.session = session;

    return handler(request, context);
  };
}

/**
 * Get user session information
 * @returns {Object|null} - User session or null if not authenticated
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Check if user has specific role
 * @param {string} role - Role to check
 * @returns {boolean} - True if user has the role
 */
export async function hasRole(role) {
  const user = await getCurrentUser();
  return user?.role === role;
}

/**
 * Check if user is a teacher
 * @returns {boolean} - True if user is a teacher
 */
export async function isTeacher() {
  return await hasRole('teacher');
}

/**
 * Check if user is a student
 * @returns {boolean} - True if user is a student
 */
export async function isStudent() {
  return await hasRole('student');
}

/**
 * Check if user is an admin
 * @returns {boolean} - True if user is an admin
 */
export async function isAdmin() {
  return await hasRole('admin');
}