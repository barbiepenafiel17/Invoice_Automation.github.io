const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (for the frontend)
app.use(express.static(path.join(__dirname)));

// Configure multer for handling file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Email configuration
const createTransporter = (fromEmail, appPassword) => {
    return nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: fromEmail,
            pass: appPassword
        }
    });
};

// Gmail API Configuration
class GmailAPIService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
            process.env.GMAIL_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'
        );

        // Set refresh token if available
        if (process.env.GMAIL_REFRESH_TOKEN) {
            this.oauth2Client.setCredentials({
                refresh_token: process.env.GMAIL_REFRESH_TOKEN
            });
        }

        this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        console.log('🔐 Gmail API Service initialized');
        console.log('📧 Gmail User:', process.env.GMAIL_USER_EMAIL || process.env.GMAIL_USER || process.env.FROM_EMAIL);
    }

    async sendEmail(emailData) {
        try {
            console.log('📧 Sending email via Gmail API...');

            // Create email message
            const message = this.createMessage(emailData);
            
            // Send email
            const result = await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: message
                }
            });

            console.log('✅ Gmail API email sent:', result.data.id);
            return {
                success: true,
                messageId: result.data.id,
                threadId: result.data.threadId
            };

        } catch (error) {
            console.error('❌ Gmail API error:', error);
            throw error;
        }
    }

    createMessage(emailData) {
        const { to, subject, html, text, attachments, fromName, fromEmail } = emailData;
        
        // Create boundaries for multipart message
        const boundary = 'invoice_automation_' + Date.now();
        const attachmentBoundary = 'attachment_' + Date.now();

        let message = [
            `From: ${fromName} <${fromEmail}>`,
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            '',
            `--${boundary}`,
            'Content-Type: multipart/alternative; boundary="alt_boundary"',
            '',
            '--alt_boundary',
            'Content-Type: text/plain; charset=utf-8',
            '',
            text || this.htmlToText(html),
            '',
            '--alt_boundary',
            'Content-Type: text/html; charset=utf-8',
            '',
            html,
            '',
            '--alt_boundary--'
        ];

        // Add attachments if present
        if (attachments && attachments.length > 0) {
            attachments.forEach(attachment => {
                message.push(
                    `--${boundary}`,
                    `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
                    'Content-Transfer-Encoding: base64',
                    `Content-Disposition: attachment; filename="${attachment.filename}"`,
                    '',
                    attachment.content,
                    ''
                );
            });
        }

        message.push(`--${boundary}--`);

        // Encode message in base64url format
        const rawMessage = message.join('\n');
        return Buffer.from(rawMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    htmlToText(html) {
        // Simple HTML to text conversion
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
    }

    async verifyCredentials() {
        try {
            await this.oauth2Client.getAccessToken();
            const profile = await this.gmail.users.getProfile({ userId: 'me' });
            return {
                success: true,
                email: profile.data.emailAddress,
                messagesTotal: profile.data.messagesTotal
            };
        } catch (error) {
            console.error('❌ Gmail API credential verification failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Initialize Gmail API service
const gmailAPI = new GmailAPIService();

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Invoice Automation Email Service',
        timestamp: new Date().toISOString()
    });
});

// Gmail API credentials verification endpoint
app.get('/api/gmail-verify', async (req, res) => {
    console.log('🔐 Verifying Gmail API credentials...');
    
    try {
        const verification = await gmailAPI.verifyCredentials();
        res.json(verification);
    } catch (error) {
        console.error('❌ Gmail verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify Gmail API credentials',
            details: error.message
        });
    }
});

// Gmail API email sending endpoint
app.post('/api/send-gmail', upload.single('pdf'), async (req, res) => {
    console.log('📧 Gmail API email request received:', {
        body: req.body ? 'Present' : 'Missing',
        file: req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file'
    });

    try {
        const {
            toEmail,
            subject,
            htmlContent,
            textContent,
            fromName,
            fromEmail,
            invoiceNumber,
            clientName,
            totalAmount,
            dueDate
        } = req.body;

        // Validation
        if (!toEmail || !subject) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: toEmail, subject'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(toEmail)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Prepare attachments
        const attachments = [];
        if (req.file) {
            attachments.push({
                filename: req.file.originalname || `invoice-${invoiceNumber || 'draft'}.pdf`,
                content: req.file.buffer.toString('base64'),
                contentType: 'application/pdf'
            });
            console.log('📎 PDF attachment prepared:', req.file.originalname);
        }

        // Create default content if not provided
        const defaultHtml = htmlContent || `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1f2937, #374151); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="margin: 0;">📄 Invoice from ${fromName || 'Invoice Automation'}</h2>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Your invoice is ready!</p>
                </div>
                
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                        <h3 style="color: #1f2937; margin-top: 0;">Invoice Details:</h3>
                        ${invoiceNumber ? `<p><strong>Invoice Number:</strong> ${invoiceNumber}</p>` : ''}
                        ${clientName ? `<p><strong>Client:</strong> ${clientName}</p>` : ''}
                        ${totalAmount ? `<p><strong>Total Amount:</strong> $${parseFloat(totalAmount).toFixed(2)}</p>` : ''}
                        ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
                        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                    
                    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
                        <p style="margin: 0; font-size: 14px;">Thank you for your business!</p>
                        <p style="margin: 5px 0 0 0; font-size: 12px;">Generated by Invoice Automation • ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
        `;

        const defaultText = textContent || `
Invoice from ${fromName || 'Invoice Automation'}

${invoiceNumber ? `Invoice Number: ${invoiceNumber}` : ''}
${clientName ? `Client: ${clientName}` : ''}
${totalAmount ? `Total Amount: $${parseFloat(totalAmount).toFixed(2)}` : ''}
${dueDate ? `Due Date: ${new Date(dueDate).toLocaleDateString()}` : ''}
Generated: ${new Date().toLocaleDateString()}

Thank you for your business!

---
Generated by Invoice Automation • ${new Date().toLocaleDateString()}
        `.trim();

        // Prepare email data
        const emailData = {
            to: toEmail,
            subject: subject,
            html: defaultHtml,
            text: defaultText,
            fromName: fromName || process.env.FROM_NAME || 'Invoice Automation',
            fromEmail: fromEmail || process.env.GMAIL_USER || process.env.FROM_EMAIL,
            attachments: attachments
        };

        console.log('📧 Sending via Gmail API to:', toEmail);

        // Send email via Gmail API
        const result = await gmailAPI.sendEmail(emailData);

        console.log('✅ Gmail API email sent successfully:', result.messageId);

        res.json({
            success: true,
            message: 'Email sent successfully via Gmail API!',
            messageId: result.messageId,
            threadId: result.threadId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Gmail API email error:', error);
        
        let errorMessage = 'Failed to send email via Gmail API';
        let statusCode = 500;
        
        // Handle specific Gmail API errors
        if (error.code === 400) {
            statusCode = 400;
            errorMessage = 'Bad request. Please check your Gmail API configuration.';
        } else if (error.code === 401) {
            statusCode = 401;
            errorMessage = 'Unauthorized. Please check your OAuth2 credentials or refresh token.';
        } else if (error.code === 403) {
            statusCode = 403;
            errorMessage = 'Forbidden. Gmail API access may be restricted or quota exceeded.';
        } else if (error.code === 429) {
            statusCode = 429;
            errorMessage = 'Rate limit exceeded. Please try again later.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        // Always return JSON response
        return res.status(statusCode).json({
            success: false,
            error: errorMessage,
            code: error.code || 'UNKNOWN_ERROR',
            details: process.env.NODE_ENV === 'development' ? {
                stack: error.stack,
                originalError: error.toString()
            } : undefined
        });
    }
});

// Main email sending endpoint
app.post('/api/send-email', upload.single('pdf'), async (req, res) => {
    console.log('📧 Email request received:', {
        body: req.body ? 'Present' : 'Missing',
        file: req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file'
    });

    try {
        // Extract form data
        const {
            fromEmail,
            appPassword,
            toEmail,
            subject,
            message,
            invoiceNumber
        } = req.body;

        // Validation
        if (!fromEmail || !appPassword || !toEmail || !subject) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: fromEmail, appPassword, toEmail, subject'
            });
        }

        // Validate email formats
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(fromEmail) || !emailRegex.test(toEmail)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Create transporter
        const transporter = createTransporter(fromEmail, appPassword);

        // Verify connection
        await transporter.verify();
        console.log('✅ SMTP connection verified');

        // Prepare email options
        const mailOptions = {
            from: `Invoice Automation <${fromEmail}>`,
            to: toEmail,
            subject: subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1f2937, #374151); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                        <h2 style="margin: 0; font-size: 24px;">📄 Invoice from Invoice Automation</h2>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your invoice is ready!</p>
                    </div>
                    
                    <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
                        <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                            <h3 style="color: #1f2937; margin-top: 0;">Invoice Details:</h3>
                            ${invoiceNumber ? `<p><strong>Invoice Number:</strong> ${invoiceNumber}</p>` : ''}
                            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
                            <p><strong>From:</strong> ${fromEmail}</p>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 6px; border-left: 4px solid #059669;">
                            <h4 style="color: #059669; margin-top: 0;">Message:</h4>
                            <p style="line-height: 1.6; color: #374151;">
                                ${message || 'Please find your invoice attached to this email.'}
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                Generated by <strong>Invoice Automation</strong> • ${new Date().toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            `,
            text: `
Invoice from Invoice Automation

${invoiceNumber ? `Invoice Number: ${invoiceNumber}` : ''}
Generated: ${new Date().toLocaleDateString()}
From: ${fromEmail}

Message:
${message || 'Please find your invoice attached to this email.'}

---
Generated by Invoice Automation • ${new Date().toLocaleDateString()}
            `.trim()
        };

        // Add PDF attachment if present
        if (req.file) {
            mailOptions.attachments = [{
                filename: req.file.originalname || `invoice-${invoiceNumber || 'draft'}.pdf`,
                content: req.file.buffer,
                contentType: 'application/pdf'
            }];
            console.log('📎 PDF attachment added:', req.file.originalname);
        }

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);

        res.json({
            success: true,
            message: 'Email sent successfully!',
            messageId: info.messageId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Email error:', error);
        
        let errorMessage = 'Failed to send email';
        
        // Provide specific error messages
        if (error.code === 'EAUTH') {
            errorMessage = 'Gmail authentication failed. Please check your email and app password.';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.responseCode === 550) {
            errorMessage = 'Invalid recipient email address.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        res.status(500).json({
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Fallback endpoint for simple email (without attachment)
app.post('/api/send-simple-email', async (req, res) => {
    console.log('📧 Simple email request received');

    try {
        const {
            fromEmail,
            appPassword,
            toEmail,
            subject,
            message
        } = req.body;

        if (!fromEmail || !appPassword || !toEmail || !subject) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const transporter = createTransporter(fromEmail, appPassword);
        await transporter.verify();

        const mailOptions = {
            from: `Invoice Automation <${fromEmail}>`,
            to: toEmail,
            subject: subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1f2937;">📄 Invoice Notification</h2>
                    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #059669;">
                        <p style="line-height: 1.6; margin: 0;">${message || 'This is a notification from Invoice Automation.'}</p>
                    </div>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                        Generated by Invoice Automation • ${new Date().toLocaleDateString()}
                    </p>
                </div>
            `,
            text: message || 'This is a notification from Invoice Automation.'
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Simple email sent:', info.messageId);

        res.json({
            success: true,
            message: 'Email sent successfully!',
            messageId: info.messageId
        });

    } catch (error) {
        console.error('❌ Simple email error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send email'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 Invoice Automation Server Started!');
    console.log(`📧 Email Service: http://localhost:${PORT}/api/send-email`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('📋 Available Endpoints:');
    console.log('  POST /api/send-email - Send email with PDF attachment');
    console.log('  POST /api/send-simple-email - Send simple email');
    console.log('  GET  /api/health - Service health check');
    console.log('');
    console.log('💡 Ready to process invoice emails!');
});

module.exports = app;
