/**
 * Exchange authorization code for refresh token
 * Usage: node exchange-code.js YOUR_AUTHORIZATION_CODE
 */

const { google } = require('googleapis');
require('dotenv').config(); // Read from root .env file

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
);

const authorizationCode = process.argv[2];

if (!authorizationCode) {
    console.log('❌ Please provide the authorization code');
    console.log('Usage: node exchange-code.js YOUR_AUTHORIZATION_CODE');
    process.exit(1);
}

async function getRefreshToken() {
    try {
        console.log('🔄 Exchanging authorization code for refresh token...');
        
        const { tokens } = await oauth2Client.getToken(authorizationCode);
        
        console.log('✅ Successfully obtained tokens!');
        console.log('');
        console.log('📋 Add this to your .env file:');
        console.log('');
        console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('');
        console.log('💡 Your Gmail API setup is complete!');
        
    } catch (error) {
        console.error('❌ Error exchanging code:', error.message);
        console.log('');
        console.log('💡 Make sure:');
        console.log('1. The authorization code is correct');
        console.log('2. You haven\'t used this code before (codes expire after first use)');
        console.log('3. Your Google Cloud project has Gmail API enabled');
    }
}

getRefreshToken();
