/**
 * Gmail API OAuth2 Refresh Token Generator
 * Run this script to generate a refresh token for Gmail API access
 */

const { google } = require('googleapis');
require('dotenv').config({ path: './server/.env' });

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
);

console.log('🔍 Using Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Found' : 'Missing');
console.log('🔍 Using Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Found' : 'Missing');

// Scopes for Gmail API
const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly'
];

console.log('🔐 Gmail API Refresh Token Generator');
console.log('=====================================');
console.log('');

// Generate authorization URL
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
});

console.log('📋 Step 1: Visit this URL in your browser:');
console.log('');
console.log(authUrl);
console.log('');
console.log('📋 Step 2: After authorization, copy the authorization code');
console.log('📋 Step 3: Run: node exchange-code.js YOUR_AUTHORIZATION_CODE');
console.log('');
console.log('💡 The authorization code will look like: 4/0AX4XfWhXXXXXXXXXXXX');
console.log('');
