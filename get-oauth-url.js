/**
 * Simple OAuth URL Generator for Gmail API
 */

require('dotenv').config(); // Read from root .env file

console.log('🔐 Gmail API Setup Instructions');
console.log('================================');
console.log('');
console.log('📋 Your Google Cloud Project Credentials:');
console.log(`Client ID: ${process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID || 'NOT FOUND'}`);
console.log(`Client Secret: ${process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET ? '✅ Found' : '❌ Missing'}`);
console.log(`Email: ${process.env.GMAIL_USER_EMAIL || process.env.GMAIL_USER || process.env.FROM_EMAIL || 'NOT SET'}`);
console.log('');

const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
if (!clientId) {
    console.log('❌ Error: GOOGLE_CLIENT_ID not found in environment variables');
    console.log('💡 Make sure your .env file contains the correct credentials');
    process.exit(1);
}

const redirectUri = 'urn:ietf:wg:oauth:2.0:oob';
const scope = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly';

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `response_type=code&` +
    `access_type=offline&` +
    `prompt=consent`;

console.log('📋 Step 1: Click this URL to authorize Gmail API access:');
console.log('');
console.log(authUrl);
console.log('');
console.log('📋 Step 2: After authorization, you\'ll get an authorization code');
console.log('📋 Step 3: Run: node exchange-code.js YOUR_AUTHORIZATION_CODE');
console.log('📋 Step 4: Add the refresh token to your .env file');
console.log('');
console.log('💡 Make sure Gmail API is enabled in your Google Cloud Console!');
