// Test Environment Variables
require('dotenv').config();

console.log('🔍 Testing Environment Variables...');
console.log('📧 GMAIL_USER:', process.env.GMAIL_USER);
console.log('🔑 GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'Set ✅' : 'Not Set ❌');
console.log('📨 FROM_EMAIL:', process.env.FROM_EMAIL);
console.log('🔐 JWT_SECRET:', process.env.JWT_SECRET ? 'Set ✅' : 'Not Set ❌');
console.log('🌐 GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set ✅' : 'Not Set ❌');
console.log('🔗 FRONTEND_URL:', process.env.FRONTEND_URL);

console.log('\n📂 Current working directory:', process.cwd());
console.log('📁 .env file path should be:', require('path').join(process.cwd(), '.env'));
