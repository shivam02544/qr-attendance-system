#!/usr/bin/env node

/**
 * Repository Setup Script
 * This script helps configure repository URLs and metadata after cloning
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

function updateFile(filePath, replacements) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    for (const [placeholder, value] of Object.entries(replacements)) {
      const regex = new RegExp(placeholder, 'g');
      content = content.replace(regex, value);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${path.relative(projectRoot, filePath)}`);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

function setupRepository() {
  console.log('🚀 Setting up QR Attendance System repository...\n');
  
  // Get repository info from git remote
  let repoUrl = '';
  let username = '';
  let repoName = '';
  
  try {
    const { execSync } = require('child_process');
    repoUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    
    // Parse GitHub URL
    const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) {
      username = match[1];
      repoName = match[2];
    }
  } catch (error) {
    console.log('⚠️  Could not detect git remote. Please set up manually.');
  }
  
  if (!username || !repoName) {
    console.log('Please provide your repository information:');
    console.log('Example: https://github.com/prabhujee/qr-attendance-system');
    console.log('\nManually replace the following placeholders in these files:');
    console.log('- USERNAME -> your GitHub username');
    console.log('- REPOSITORY -> your repository name');
    console.log('- YOUR_DOMAIN -> your deployment domain');
    console.log('\nFiles to update:');
    console.log('- package.json');
    console.log('- CHANGELOG.md');
    console.log('- README.md');
    console.log('- CONTRIBUTING.md');
    console.log('- DEPLOYMENT.md');
    return;
  }
  
  const replacements = {
    'USERNAME': username,
    'REPOSITORY': repoName,
    'YOUR_USERNAME': username,
    'YOUR_DOMAIN': `${repoName}` // Can be customized
  };
  
  // Files to update
  const filesToUpdate = [
    path.join(projectRoot, 'package.json'),
    path.join(projectRoot, 'CHANGELOG.md'),
    path.join(projectRoot, 'README.md'),
    path.join(projectRoot, 'CONTRIBUTING.md'),
    path.join(projectRoot, 'DEPLOYMENT.md')
  ];
  
  console.log(`Detected repository: ${username}/${repoName}\n`);
  
  filesToUpdate.forEach(file => {
    if (fs.existsSync(file)) {
      updateFile(file, replacements);
    }
  });
  
  console.log('\n✨ Repository setup complete!');
  console.log('\nNext steps:');
  console.log('1. Review the updated files');
  console.log('2. Update NEXTAUTH_URL in your environment variables');
  console.log('3. Commit and push your changes');
  console.log('4. Deploy to your preferred platform');
}

// Run the setup
setupRepository();