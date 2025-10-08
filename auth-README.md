# Authentication System

This document describes the authentication system implemented for the QR Attendance System.

## Overview

The authentication system uses NextAuth.js with a credentials provider and MongoDB for user storage. It supports three user roles: teacher, student, and admin.

## Features

- ✅ User registration with email/password
- ✅ Secure password hashing with bcryptjs
- ✅ JWT-based session management
- ✅ Role-based access control (teacher, student, admin)
- ✅ Protected API routes with middleware
- ✅ User account management (activate/deactivate)
- ✅ Input validation and error handling

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/signin` - Login (handled by NextAuth)
- `POST /api/auth/signout` - Logout (handled by NextAuth)
- `GET /api/auth/me` - Get current user information

### Protected Routes (Examples)
- `GET /api/protected` - General protected route (any authenticated user)
- `GET /api/teacher/test` - Teacher-only route
- `GET /api/student/test` - Student-only route
- `GET /api/admin/test` - Admin-only route

## Environment Variables

Make sure to set these in your `.env.local` file:

```env
MONGODB_URI=mongodb://localhost:27017/qr-attendance-system
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

## Usage Examples

### Register a New User

```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe',
    role: 'teacher' // or 'student' or 'admin'
  })
});
```

### Protect an API Route

```javascript
import { withAuth } from '../../../lib/auth';

async function handler(request) {
  const user = request.session.user;
  // Your protected route logic here
  return NextResponse.json({ message: 'Success', user });
}

// Protect for any authenticated user
export const GET = withAuth(handler);

// Protect for specific roles
export const POST = withAuth(handler, ['teacher', 'admin']);
```

### Get Current User in Component

```javascript
import { useSession } from 'next-auth/react';

function MyComponent() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <p>Loading...</p>;
  if (status === 'unauthenticated') return <p>Not logged in</p>;
  
  return <p>Welcome, {session.user.name}!</p>;
}
```

## Testing

Run the authentication tests:

```bash
# Start the development server first
npm run dev

# In another terminal, run the tests
npm run test-auth
```

## Security Features

1. **Password Hashing**: Passwords are hashed using bcryptjs with salt rounds of 12
2. **JWT Security**: Sessions use JWT tokens with configurable expiration
3. **Role-Based Access**: API routes can be protected by user roles
4. **Input Validation**: All inputs are validated on both client and server side
5. **Error Handling**: Secure error messages that don't leak sensitive information

## User Roles

- **Teacher**: Can create classes, generate QR codes, view attendance reports
- **Student**: Can enroll in classes, scan QR codes, view personal attendance
- **Admin**: Can manage all users, view system-wide reports, access all data

## Database Schema

The User model includes:
- `email`: Unique email address (indexed)
- `passwordHash`: Bcrypt hashed password
- `name`: User's full name
- `role`: User role (teacher/student/admin)
- `isActive`: Account status (default: true)
- `createdAt`: Account creation timestamp
- `updatedAt`: Last update timestamp

## Next Steps

After implementing authentication, you can:
1. Create login/registration UI components
2. Add password reset functionality
3. Implement email verification
4. Add OAuth providers (Google, etc.)
5. Create user profile management pages