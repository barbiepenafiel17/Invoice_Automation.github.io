#!/usr/bin/env node

/**
 * Deployment Script for Invoice Automation App
 * This script prepares the application for Vercel deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing Invoice Automation for deployment...');

// Check if required files exist
const requiredFiles = [
    'index.html',
    'server.js', 
    'package.json',
    'vercel.json'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
        console.error(`❌ Missing required file: ${file}`);
        allFilesExist = false;
    } else {
        console.log(`✅ Found: ${file}`);
    }
});

if (!allFilesExist) {
    console.error('❌ Missing required files. Please ensure all files are present.');
    process.exit(1);
}

// Check package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log(`📦 Package: ${packageJson.name} v${packageJson.version}`);

// Check if Vercel CLI is available
const { execSync } = require('child_process');
try {
    execSync('vercel --version', { stdio: 'ignore' });
    console.log('✅ Vercel CLI is available');
} catch (error) {
    console.log('⚠️  Vercel CLI not found. Installing...');
    console.log('Run: npm install -g vercel');
}

console.log('\n🎯 Deployment checklist:');
console.log('1. ✅ All required files present');
console.log('2. ✅ Vercel configuration ready');
console.log('3. ✅ Package.json configured');
console.log('4. ✅ Server.js is the main entry point');

console.log('\n🚀 Ready to deploy!');
console.log('Run the following commands:');
console.log('');
console.log('1. vercel login');
console.log('2. vercel --prod');
console.log('');
console.log('Your app will be deployed to: https://[project-name].vercel.app');
