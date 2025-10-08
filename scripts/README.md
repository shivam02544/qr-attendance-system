# Scripts

This directory contains utility scripts for the QR Attendance System.

## setup-repo.js

Automatically configures repository URLs and metadata after cloning the project.

### Usage

```bash
npm run setup-repo
```

### What it does

- Detects your GitHub repository information from git remote
- Updates placeholder URLs in documentation files
- Configures package.json with correct repository URLs
- Provides guidance for manual setup if auto-detection fails

### Files Updated

- `package.json` - Repository URLs and metadata
- `CHANGELOG.md` - Release links
- `README.md` - Clone instructions
- `CONTRIBUTING.md` - Development setup
- `DEPLOYMENT.md` - Deployment URLs

### Manual Setup

If the script cannot auto-detect your repository, manually replace these placeholders:

- `USERNAME` → Your GitHub username
- `REPOSITORY` → Your repository name  
- `YOUR_USERNAME` → Your GitHub username
- `YOUR_DOMAIN` → Your deployment domain

### Environment Variables

Don't forget to update your environment variables:

```env
NEXTAUTH_URL=https://your-actual-domain.com
MONGODB_URI=your-mongodb-connection-string
NEXTAUTH_SECRET=your-secure-secret-key
```