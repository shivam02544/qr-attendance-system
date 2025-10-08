# QR Attendance System

A modern, location-based attendance tracking system built with Next.js, featuring QR code scanning and real-time attendance management.

## 🚀 Features

- **QR Code Attendance**: Generate and scan QR codes for quick attendance marking
- **Location Verification**: GPS-based location validation to prevent proxy attendance
- **Role-Based Access**: Separate dashboards for students, teachers, and administrators
- **Real-Time Reports**: Comprehensive attendance analytics and reporting
- **Responsive Design**: Mobile-first design that works on all devices
- **Security First**: Built-in security measures including rate limiting and input validation
- **Offline Support**: Progressive Web App capabilities for offline functionality

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **QR Code**: qrcode library for generation, html5-qrcode for scanning
- **Testing**: Vitest, Testing Library, MongoDB Memory Server
- **Security**: Helmet, bcryptjs, express-rate-limit, DOMPurify

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB (local installation or MongoDB Atlas)
- Modern web browser with camera access for QR scanning

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/shivam02544/qr-attendance-system.git
cd qr-attendance-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure repository (optional)
```bash
npm run setup-repo
```
This script automatically updates repository URLs in documentation files.

### 4. Set up environment variables
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/qr-attendance-system
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

### 5. Seed the database (optional)
```bash
npm run seed
```

### 6. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📱 User Roles & Features

### Students
- Scan QR codes to mark attendance
- View attendance history and statistics
- Enroll in classes
- Location-based attendance verification

### Teachers
- Generate QR codes for attendance sessions
- Manage classes and student enrollments
- View real-time attendance data
- Generate attendance reports
- Export attendance data

### Administrators
- System-wide analytics and reporting
- User management (students, teachers)
- Class management and oversight
- Security monitoring and logs

## 🧪 Testing

Run the test suite:
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## 📊 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed` - Seed database with sample data
- `npm run test-db` - Test database connection
- `npm run test-auth` - Test authentication setup

## 🏗️ Project Structure

```
qr-attendance-system/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── admin/             # Admin pages
│   ├── student/           # Student pages
│   └── teacher/           # Teacher pages
├── components/            # React components
│   ├── admin/            # Admin-specific components
│   ├── shared/           # Shared components
│   ├── student/          # Student-specific components
│   └── teacher/          # Teacher-specific components
├── lib/                  # Utility libraries
├── models/               # MongoDB models
├── hooks/                # Custom React hooks
├── tests/                # Test files
└── database/             # Database utilities
```

## 🔒 Security Features

- Password hashing with bcryptjs
- Rate limiting on API endpoints
- Input validation and sanitization
- CSRF protection
- Secure headers with Helmet
- Environment variable protection

## 🌐 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm start
```

## 📖 Documentation

- [Security Guidelines](./SECURITY.md)
- [Responsive Design](./RESPONSIVE_DESIGN.md)
- [Authentication Setup](./auth-README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include steps to reproduce any bugs

## 👨‍💻 Author

**Prabhu Jee**
LinkedIn- https://www.linkedin.com/in/prabhat001?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app

