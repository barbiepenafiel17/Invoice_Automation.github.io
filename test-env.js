// Direct .env test
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing .env file reading...');
console.log('Current directory:', __dirname);

// Try reading the .env file directly
const envPath = path.join(__dirname, 'server', '.env');
console.log('Looking for .env at:', envPath);

if (fs.existsSync(envPath)) {
    console.log('✅ .env file found');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Look for GOOGLE_CLIENT_ID line
    const lines = envContent.split('\n');
    const clientIdLine = lines.find(line => line.startsWith('GOOGLE_CLIENT_ID='));
    const clientSecretLine = lines.find(line => line.startsWith('GOOGLE_CLIENT_SECRET='));
    
    console.log('GOOGLE_CLIENT_ID line:', clientIdLine);
    console.log('GOOGLE_CLIENT_SECRET line:', clientSecretLine ? 'Found' : 'Not found');
    
    // Now try loading with dotenv
    require('dotenv').config({ path: envPath });
    console.log('After dotenv load:');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Found' : 'Not found');
    
} else {
    console.log('❌ .env file not found at:', envPath);
}
