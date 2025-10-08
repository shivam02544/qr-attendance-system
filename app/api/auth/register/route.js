import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import User from '../../../../models/User';
import { 
  withRegistrationSecurity, 
  withValidation, 
  validationSchemas
} from '../../../../lib/securityMiddleware';
import { 
  logSecurityEvent,
  logInvalidInput,
  SECURITY_EVENTS,
  LOG_LEVELS 
} from '../../../../lib/securityLogger';

// Apply security middleware to POST endpoint
const securePostHandler = withRegistrationSecurity(
  withValidation(validationSchemas.registration)(
    async function postHandler(request) {
      try {
        // Get sanitized and validated data
        const { email, password, name, role } = request.validatedData;

        await connectDB();

        // Check if user already exists
        const existingUser = await User.findOne({ 
          email: email.toLowerCase() 
        });

        if (existingUser) {
          // Log potential account enumeration attempt
          await logSecurityEvent(
            SECURITY_EVENTS.REGISTRATION,
            LOG_LEVELS.MEDIUM,
            {
              reason: 'duplicate_email',
              email: email.toLowerCase(),
              ip: request.headers.get('x-forwarded-for') || 'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown'
            }
          );

          return NextResponse.json(
            { error: 'User with this email already exists' },
            { status: 409 }
          );
        }

        // Create new user (password will be hashed by the pre-save middleware)
        const user = new User({
          email: email.toLowerCase(),
          passwordHash: password, // Will be hashed by pre-save hook
          name: name.trim(),
          role
        });

        await user.save();

        // Log successful registration
        await logSecurityEvent(
          SECURITY_EVENTS.REGISTRATION,
          LOG_LEVELS.LOW,
          {
            userId: user._id.toString(),
            email: email.toLowerCase(),
            role,
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        );

        // Return user without password
        const safeUser = user.toSafeObject();

        return NextResponse.json(
          { 
            message: 'User registered successfully',
            user: safeUser
          },
          { status: 201 }
        );

      } catch (error) {
        console.error('Registration error:', error);

        // Log registration error
        await logSecurityEvent(
          SECURITY_EVENTS.SYSTEM_ERROR,
          LOG_LEVELS.MEDIUM,
          {
            error: error.message,
            stack: error.stack,
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        );

        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
          const validationErrors = Object.values(error.errors).map(err => err.message);
          
          await logInvalidInput(
            { validationErrors },
            '/api/auth/register',
            {
              ip: request.headers.get('x-forwarded-for') || 'unknown'
            }
          );

          return NextResponse.json(
            { error: validationErrors.join(', ') },
            { status: 400 }
          );
        }

        // Handle duplicate key error (email already exists)
        if (error.code === 11000) {
          return NextResponse.json(
            { error: 'User with this email already exists' },
            { status: 409 }
          );
        }

        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    }
  )
);

export const POST = securePostHandler;