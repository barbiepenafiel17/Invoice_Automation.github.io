const express = require('express');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const { verifyToken } = require('./auth');
const router = express.Router();

// Gmail OAuth2 setup
const OAuth2 = google.auth.OAuth2;

// Create OAuth2 client
const createTransporter = async () => {
  try {
    const oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    const accessToken = await new Promise((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) {
          console.error("Failed to create access token:", err);
          reject(err);
        }
        resolve(token);
      });
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        accessToken,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN
      }
    });

    return transporter;
  } catch (error) {
    console.error('Error creating transporter:', error);
    throw error;
  }
};

// Fallback to basic SMTP if OAuth2 fails
const createBasicTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD // Use App Password for Gmail
    }
  });
};

// Send invoice email
router.post('/send-invoice', verifyToken, async (req, res) => {
  try {
    const { 
      to, 
      subject, 
      message, 
      invoiceData, 
      pdfBuffer,
      fileName = 'invoice.pdf'
    } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject' 
      });
    }

    let transporter;
    try {
      // Try OAuth2 first
      transporter = await createTransporter();
    } catch (oauthError) {
      console.log('OAuth2 failed, falling back to basic auth:', oauthError.message);
      // Fallback to basic auth
      transporter = createBasicTransporter();
    }

    // Prepare email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Invoice from ${req.user.name || 'Invoice Automation'}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Professional Invoice Delivery</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <div style="margin-bottom: 20px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              ${message || 'Please find your invoice attached to this email. Thank you for your business!'}
            </p>
          </div>
          
          ${invoiceData ? `
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Invoice Summary</h3>
            <div style="display: grid; gap: 10px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                <span style="color: #6b7280;">Invoice Number:</span>
                <span style="color: #1f2937; font-weight: 600;">${invoiceData.invoiceNumber || 'N/A'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                <span style="color: #6b7280;">Date:</span>
                <span style="color: #1f2937;">${invoiceData.date || new Date().toLocaleDateString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                <span style="color: #6b7280;">Total Amount:</span>
                <span style="color: #1f2937; font-weight: bold; font-size: 18px;">$${invoiceData.total || '0.00'}</span>
              </div>
            </div>
          </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This email was sent from Invoice Automation System
            </p>
            <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">
              If you have any questions, please contact us at ${req.user.email || process.env.FROM_EMAIL || process.env.GMAIL_USER}
            </p>
          </div>
        </div>
      </div>
    `;

    // Email options
    const mailOptions = {
      from: {
        name: process.env.FROM_NAME || req.user.name || 'Invoice Automation',
        address: process.env.FROM_EMAIL || process.env.GMAIL_USER
      },
      to: to,
      subject: subject,
      html: htmlContent,
      text: message || 'Please find your invoice attached to this email. Thank you for your business!'
    };

    // Add PDF attachment if provided
    if (pdfBuffer) {
      mailOptions.attachments = [{
        filename: fileName,
        content: Buffer.from(pdfBuffer, 'base64'),
        contentType: 'application/pdf'
      }];
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent:', info.messageId);
    
    res.json({
      success: true,
      message: 'Invoice sent successfully!',
      messageId: info.messageId,
      recipient: to
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
});

// Test email configuration
router.post('/test', verifyToken, async (req, res) => {
  try {
    let transporter;
    try {
      transporter = await createTransporter();
    } catch (oauthError) {
      console.log('OAuth2 failed, testing basic auth');
      transporter = createBasicTransporter();
    }

    // Test email
    const testEmail = {
      from: process.env.FROM_EMAIL || process.env.GMAIL_USER,
      to: req.user.email || process.env.FROM_EMAIL || process.env.GMAIL_USER,
      subject: 'Test Email - Invoice Automation',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #1f2937;">Email Configuration Test</h2>
          <p>This is a test email from your Invoice Automation system.</p>
          <p><strong>Status:</strong> ✅ Email service is working correctly!</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>User:</strong> ${req.user.name} (${req.user.email})</p>
        </div>
      `
    };

    const info = await transporter.sendMail(testEmail);
    
    res.json({
      success: true,
      message: 'Test email sent successfully!',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Email test failed:', error);
    res.status(500).json({ 
      error: 'Email test failed',
      details: error.message 
    });
  }
});

// Get email configuration status
router.get('/config-status', verifyToken, (req, res) => {
  const hasGmailConfig = !!(
    process.env.GMAIL_USER && 
    (process.env.GMAIL_APP_PASSWORD || 
     (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN))
  );

  res.json({
    success: true,
    configured: hasGmailConfig,
    authMethod: process.env.GMAIL_REFRESH_TOKEN ? 'OAuth2' : 'App Password',
    email: process.env.GMAIL_USER || null
  });
});

module.exports = router;
