# Contributing to QR Attendance System

Thank you for your interest in contributing to the QR Attendance System! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Git
- A modern web browser

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/REPOSITORY.git`
3. Install dependencies: `npm install`
4. Copy environment file: `cp .env.local.example .env.local`
5. Configure your environment variables
6. Run tests: `npm test`
7. Start development server: `npm run dev`

## 📋 Development Guidelines

### Code Style
- Use ESLint configuration provided in the project
- Follow existing code patterns and conventions
- Use meaningful variable and function names
- Add comments for complex logic

### Testing
- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for good test coverage
- Use the existing test patterns (Vitest + Testing Library)

### Commit Messages
Use conventional commit format:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `test: add or update tests`
- `refactor: code refactoring`
- `style: formatting changes`

## 🔄 Pull Request Process

1. **Create a feature branch**: `git checkout -b feature/your-feature-name`
2. **Make your changes**: Follow the development guidelines
3. **Test thoroughly**: Run all tests and manual testing
4. **Update documentation**: Update README or other docs if needed
5. **Commit your changes**: Use conventional commit messages
6. **Push to your fork**: `git push origin feature/your-feature-name`
7. **Create Pull Request**: Use the PR template

### PR Requirements
- [ ] All tests pass
- [ ] Code follows project conventions
- [ ] Documentation updated if needed
- [ ] No breaking changes (or clearly documented)
- [ ] Security considerations addressed

## 🐛 Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Node version)
- Screenshots if applicable

## 💡 Feature Requests

For new features:
- Check existing issues first
- Provide clear use case and rationale
- Consider implementation complexity
- Discuss with maintainers before large changes

## 🔒 Security

- Report security vulnerabilities privately
- Follow security best practices
- Don't commit sensitive information
- Use environment variables for secrets

## 📚 Areas for Contribution

### High Priority
- Bug fixes and stability improvements
- Performance optimizations
- Mobile responsiveness enhancements
- Accessibility improvements

### Medium Priority
- New attendance features
- Enhanced reporting capabilities
- UI/UX improvements
- Documentation improvements

### Low Priority
- Code refactoring
- Additional test coverage
- Developer tooling improvements

## 🏗️ Architecture Guidelines

### Frontend
- Use React functional components with hooks
- Implement responsive design (mobile-first)
- Follow accessibility guidelines (WCAG)
- Use Tailwind CSS for styling

### Backend
- Use Next.js API routes
- Implement proper error handling
- Add input validation and sanitization
- Follow RESTful API principles

### Database
- Use Mongoose for MongoDB operations
- Implement proper indexing
- Follow data modeling best practices
- Add proper validation schemas

## 🧪 Testing Guidelines

### Unit Tests
- Test individual functions and components
- Mock external dependencies
- Focus on business logic

### Integration Tests
- Test API endpoints
- Test database operations
- Test component interactions

### End-to-End Tests
- Test complete user workflows
- Test critical user paths
- Test across different browsers/devices

## 📖 Documentation

### Code Documentation
- Add JSDoc comments for functions
- Document complex algorithms
- Explain business logic

### User Documentation
- Update README for new features
- Add setup instructions
- Include troubleshooting guides

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow the code of conduct

## 📞 Getting Help

- Check existing documentation
- Search through issues
- Ask questions in discussions
- Contact maintainers for guidance

## 🎉 Recognition

Contributors will be recognized in:
- README acknowledgments
- Release notes
- Project documentation

Thank you for contributing to making attendance tracking better for everyone! 🚀