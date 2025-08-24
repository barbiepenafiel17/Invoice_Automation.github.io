// Update and test .env variables
const fs = require('fs');
const path = require('path');

// Set environment variables directly for this test
process.env.GMAIL_USER = 'penafiel.barbie@dnsc.edu.ph';
process.env.GMAIL_APP_PASSWORD = 'pylc qpua vgnn clse';
process.env.FROM_EMAIL = 'penafiel.barbie@dnsc.edu.ph';
process.env.FROM_NAME = 'Invoice Automation';

console.log('🔍 Testing Direct Environment Variables...');
console.log('📧 GMAIL_USER:', process.env.GMAIL_USER);
console.log('🔑 GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'Set ✅' : 'Not Set ❌');
console.log('📨 FROM_EMAIL:', process.env.FROM_EMAIL);
console.log('👤 FROM_NAME:', process.env.FROM_NAME);

// Test Gmail connection
const nodemailer = require('nodemailer');

async function testGmail() {
    try {
        console.log('\n⚡ Creating Gmail transporter...');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });

        console.log('🔍 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ Gmail SMTP connection successful!');
        
        console.log('\n🎉 Gmail configuration is working perfectly!');
        console.log('📧 You can now send emails from your Invoice Automation app.');
        
    } catch (error) {
        console.error('❌ Gmail test failed:', error.message);
        
        if (error.code === 'EAUTH') {
            console.log('\n💡 Authentication failed. Please check:');
            console.log('1. Gmail username: ' + process.env.GMAIL_USER);
            console.log('2. App Password is correct');
            console.log('3. 2FA is enabled on your Google account');
        }
    }
}

testGmail();
