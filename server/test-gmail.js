// Test Gmail Configuration
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testGmailConfig() {
    console.log('🔍 Testing Gmail Configuration...');
    console.log('📧 Gmail User:', process.env.GMAIL_USER);
    console.log('🔑 App Password:', process.env.GMAIL_APP_PASSWORD ? 'Set ✅' : 'Not Set ❌');
    console.log('📨 From Email:', process.env.FROM_EMAIL);
    
    try {
        // Create transporter
        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });

        // Verify connection
        console.log('\n⚡ Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ Gmail SMTP connection verified successfully!');

        // Send test email
        console.log('\n📤 Sending test email...');
        const info = await transporter.sendMail({
            from: {
                name: process.env.FROM_NAME || 'Invoice Automation',
                address: process.env.FROM_EMAIL || process.env.GMAIL_USER
            },
            to: process.env.GMAIL_USER, // Send to self
            subject: 'Test Email - Gmail Configuration Updated ✅',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1f2937;">Gmail Configuration Test Successful! 🎉</h2>
                    <p>Your Invoice Automation app is now configured with:</p>
                    <ul style="background: #f9fafb; padding: 15px; border-left: 4px solid #10b981;">
                        <li><strong>Gmail User:</strong> ${process.env.GMAIL_USER}</li>
                        <li><strong>From Email:</strong> ${process.env.FROM_EMAIL}</li>
                        <li><strong>App Name:</strong> ${process.env.FROM_NAME}</li>
                        <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
                    </ul>
                    <p style="color: #059669; font-weight: bold;">✅ Email functionality is working perfectly!</p>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                        You can now send invoices directly to your clients via email from your Invoice Automation app.
                    </p>
                </div>
            `
        });

        console.log('✅ Test email sent successfully!');
        console.log('📬 Message ID:', info.messageId);
        console.log('📧 Email sent to:', process.env.GMAIL_USER);
        
        console.log('\n🎉 Gmail configuration is fully functional!');
        console.log('🚀 Your Invoice Automation app can now send emails!');
        
    } catch (error) {
        console.error('❌ Gmail configuration test failed:');
        console.error('Error:', error.message);
        
        if (error.code === 'EAUTH') {
            console.log('\n💡 Troubleshooting tips:');
            console.log('1. Make sure you have enabled 2-factor authentication on your Google account');
            console.log('2. Generate a new App Password in Google Account settings');
            console.log('3. Use the App Password (not your regular Gmail password)');
            console.log('4. Ensure "Less secure app access" is not needed (App Passwords bypass this)');
        }
    }
}

testGmailConfig();
