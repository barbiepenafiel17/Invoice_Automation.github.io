// Real Email Service - Sends actual emails to clients
import { CurrencyFormatter, DateUtils, toast } from './ui.js';
import store from './store.js';

/**
 * Real Email Service for sending actual emails
 * Uses EmailJS service for client-side email sending
 */
export class RealEmailService {
    constructor() {
        this.settings = store.getSettings();
        this.initialized = false;
        this.config = {
            serviceId: 'service_invoice', // Will be set during initialization
            templateId: 'template_invoice', // Will be set during initialization
            publicKey: '' // Will be set during initialization
        };
    }

    /**
     * Initialize EmailJS
     * @param {Object} config - EmailJS configuration
     */
    async initialize(config = {}) {
        if (this.initialized) return;

        try {
            // Load EmailJS library if not already loaded
            if (!window.emailjs) {
                await this.loadEmailJS();
            }

            // Set configuration
            if (config.serviceId) this.config.serviceId = config.serviceId;
            if (config.templateId) this.config.templateId = config.templateId;
            if (config.publicKey) this.config.publicKey = config.publicKey;

            // Initialize EmailJS
            emailjs.init(this.config.publicKey);
            this.initialized = true;
            
            console.log('Real Email Service initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Real Email Service:', error);
            throw new Error('Email service initialization failed');
        }
    }

    /**
     * Load EmailJS library dynamically
     */
    loadEmailJS() {
        return new Promise((resolve, reject) => {
            if (window.emailjs) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Check if service is configured and ready
     */
    isConfigured() {
        return this.initialized && 
               this.config.serviceId !== 'service_invoice' && 
               this.config.templateId !== 'template_invoice' && 
               this.config.publicKey !== '';
    }

    /**
     * Send invoice email directly to client
     * @param {Object} invoice - Invoice to send
     * @param {Object} options - Email options
     */
    async sendInvoiceEmail(invoice, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured. Please set up EmailJS first.');
        }

        const client = store.getClient(invoice.clientId);
        if (!client || !client.email) {
            throw new Error('Client email address not found');
        }

        try {
            const emailData = this.prepareInvoiceEmailData(invoice, client, options);
            
            const result = await emailjs.send(
                this.config.serviceId,
                this.config.templateId,
                emailData,
                this.config.publicKey
            );

            if (result.status === 200) {
                // Log successful send
                this.logEmailSent(invoice.id, client.email, 'invoice');
                return {
                    success: true,
                    message: `Invoice sent successfully to ${client.email}`,
                    messageId: result.text
                };
            } else {
                throw new Error('Failed to send email: ' + result.text);
            }
        } catch (error) {
            console.error('Email sending failed:', error);
            throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Send payment reminder email
     * @param {Object} invoice - Invoice for reminder
     * @param {Object} options - Email options
     */
    async sendPaymentReminder(invoice, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured. Please set up EmailJS first.');
        }

        const client = store.getClient(invoice.clientId);
        if (!client || !client.email) {
            throw new Error('Client email address not found');
        }

        try {
            const emailData = this.prepareReminderEmailData(invoice, client, options);
            
            const result = await emailjs.send(
                this.config.serviceId,
                this.config.templateId, // You might want a separate reminder template
                emailData,
                this.config.publicKey
            );

            if (result.status === 200) {
                this.logEmailSent(invoice.id, client.email, 'reminder');
                return {
                    success: true,
                    message: `Payment reminder sent to ${client.email}`,
                    messageId: result.text
                };
            } else {
                throw new Error('Failed to send reminder: ' + result.text);
            }
        } catch (error) {
            console.error('Reminder sending failed:', error);
            throw new Error(`Failed to send reminder: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Prepare invoice email data for EmailJS
     */
    prepareInvoiceEmailData(invoice, client, options = {}) {
        const settings = store.getSettings();
        const formatter = new CurrencyFormatter(settings.currency);
        
        return {
            // Recipient information
            to_email: client.email,
            to_name: client.name,
            client_company: client.company || '',
            
            // Invoice information
            invoice_id: invoice.id,
            invoice_amount: formatter.format(invoice.totals.grand),
            invoice_subtotal: formatter.format(invoice.totals.subtotal),
            invoice_tax: formatter.format(invoice.totals.tax),
            invoice_total: formatter.format(invoice.totals.grand),
            issue_date: DateUtils.formatDate(invoice.issueDate),
            due_date: DateUtils.formatDate(invoice.dueDate),
            payment_terms: invoice.terms,
            
            // Company information
            company_name: settings.companyName || 'Your Company',
            company_email: settings.companyEmail || '',
            company_phone: settings.companyPhone || '',
            company_address: settings.companyAddress || '',
            
            // Email content
            subject: options.subject || `Invoice ${invoice.id} - ${formatter.format(invoice.totals.grand)}`,
            message: options.message || this.generateInvoiceEmailBody(invoice, client, formatter),
            
            // Items details (for template use)
            items_list: this.formatItemsForEmail(invoice.items, formatter),
            
            // Additional options
            reply_to: settings.companyEmail || '',
            cc: options.cc || '',
            bcc: options.bcc || ''
        };
    }

    /**
     * Prepare reminder email data
     */
    prepareReminderEmailData(invoice, client, options = {}) {
        const settings = store.getSettings();
        const formatter = new CurrencyFormatter(settings.currency);
        
        // Calculate days overdue
        const dueDate = new Date(invoice.dueDate);
        const today = new Date();
        const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
        
        return {
            to_email: client.email,
            to_name: client.name,
            client_company: client.company || '',
            
            invoice_id: invoice.id,
            invoice_amount: formatter.format(invoice.totals.grand),
            due_date: DateUtils.formatDate(invoice.dueDate),
            days_overdue: Math.max(0, daysOverdue),
            
            company_name: settings.companyName || 'Your Company',
            company_email: settings.companyEmail || '',
            company_phone: settings.companyPhone || '',
            
            subject: options.subject || `Payment Reminder: Invoice ${invoice.id} - ${daysOverdue > 0 ? 'OVERDUE' : 'Due Soon'}`,
            message: options.message || this.generateReminderEmailBody(invoice, client, formatter, daysOverdue),
            
            reply_to: settings.companyEmail || ''
        };
    }

    /**
     * Generate invoice email body
     */
    generateInvoiceEmailBody(invoice, client, formatter) {
        const settings = store.getSettings();
        const companyName = settings.companyName || 'Your Company';
        
        return `Dear ${client.name},

Thank you for your business! Please find your invoice details below:

Invoice #: ${invoice.id}
Issue Date: ${DateUtils.formatDate(invoice.issueDate)}
Due Date: ${DateUtils.formatDate(invoice.dueDate)}
Total Amount: ${formatter.format(invoice.totals.grand)}

${invoice.items.length > 0 ? `
Items/Services:
${invoice.items.map(item => {
    const totals = item.calculateTotals();
    return `• ${item.description} - ${formatter.format(totals.total)}`;
}).join('\n')}
` : ''}

Payment is due by ${DateUtils.formatDate(invoice.dueDate)}. 

If you have any questions about this invoice, please don't hesitate to contact us.

Thank you for your business!

Best regards,
${companyName}
${settings.companyEmail ? settings.companyEmail : ''}
${settings.companyPhone ? settings.companyPhone : ''}`;
    }

    /**
     * Generate reminder email body
     */
    generateReminderEmailBody(invoice, client, formatter, daysOverdue) {
        const settings = store.getSettings();
        const companyName = settings.companyName || 'Your Company';
        
        let urgencyText = '';
        if (daysOverdue > 0) {
            urgencyText = `This invoice is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. `;
        } else {
            urgencyText = 'This invoice is due soon. ';
        }
        
        return `Dear ${client.name},

${urgencyText}We wanted to remind you about the following outstanding invoice:

Invoice #: ${invoice.id}
Original Due Date: ${DateUtils.formatDate(invoice.dueDate)}
Amount Due: ${formatter.format(invoice.totals.grand)}

Please remit payment at your earliest convenience. If you have already sent payment, please disregard this reminder.

If you have any questions or need to discuss payment arrangements, please contact us immediately.

Thank you for your prompt attention to this matter.

Best regards,
${companyName}
${settings.companyEmail ? settings.companyEmail : ''}
${settings.companyPhone ? settings.companyPhone : ''}`;
    }

    /**
     * Format items for email template
     */
    formatItemsForEmail(items, formatter) {
        return items.map(item => {
            const totals = item.calculateTotals();
            return {
                description: item.description,
                quantity: item.qty,
                unitPrice: formatter.format(item.unitPrice),
                total: formatter.format(totals.total)
            };
        });
    }

    /**
     * Log successful email send
     */
    logEmailSent(invoiceId, email, type) {
        const logs = JSON.parse(localStorage.getItem('invoiceApp:emailLogs') || '[]');
        logs.push({
            invoiceId,
            email,
            type,
            timestamp: new Date().toISOString(),
            status: 'sent'
        });
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('invoiceApp:emailLogs', JSON.stringify(logs));
    }

    /**
     * Get email sending history
     */
    getEmailHistory(invoiceId = null) {
        const logs = JSON.parse(localStorage.getItem('invoiceApp:emailLogs') || '[]');
        
        if (invoiceId) {
            return logs.filter(log => log.invoiceId === invoiceId);
        }
        
        return logs;
    }

    /**
     * Show setup guide modal
     */
    showSetupGuide() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>🚀 Setup Real Email Sending</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
                    <div class="setup-steps">
                        <div class="step">
                            <h4>Step 1: Create EmailJS Account</h4>
                            <p>1. Go to <a href="https://www.emailjs.com/" target="_blank">EmailJS.com</a></p>
                            <p>2. Sign up for a free account (200 emails/month free)</p>
                            <p>3. Verify your email address</p>
                        </div>
                        
                        <div class="step">
                            <h4>Step 2: Create Email Service</h4>
                            <p>1. In EmailJS dashboard, go to "Email Services"</p>
                            <p>2. Click "Add New Service"</p>
                            <p>3. Choose your email provider (Gmail, Outlook, etc.)</p>
                            <p>4. Follow the connection steps</p>
                            <p>5. Copy your <strong>Service ID</strong></p>
                        </div>
                        
                        <div class="step">
                            <h4>Step 3: Create Email Template</h4>
                            <p>1. Go to "Email Templates"</p>
                            <p>2. Click "Create New Template"</p>
                            <p>3. Use this template:</p>
                            <textarea readonly style="width: 100%; height: 120px; font-size: 12px;">
Subject: {{subject}}

Dear {{to_name}},

{{message}}

Invoice Details:
• Invoice #: {{invoice_id}}
• Amount: {{invoice_amount}}
• Due Date: {{due_date}}

Best regards,
{{company_name}}
{{company_email}}
                            </textarea>
                            <p>4. Save and copy your <strong>Template ID</strong></p>
                        </div>
                        
                        <div class="step">
                            <h4>Step 4: Get Public Key</h4>
                            <p>1. Go to "Account" → "General"</p>
                            <p>2. Copy your <strong>Public Key</strong></p>
                        </div>
                        
                        <div class="step">
                            <h4>Step 5: Configure This App</h4>
                            <div class="config-form">
                                <div class="form-group">
                                    <label>Service ID:</label>
                                    <input type="text" id="emailjs-service-id" placeholder="service_xxxxxxx">
                                </div>
                                <div class="form-group">
                                    <label>Template ID:</label>
                                    <input type="text" id="emailjs-template-id" placeholder="template_xxxxxxx">
                                </div>
                                <div class="form-group">
                                    <label>Public Key:</label>
                                    <input type="text" id="emailjs-public-key" placeholder="xxxxxxxxxxxxxxxx">
                                </div>
                                <button class="btn btn-primary" id="save-emailjs-config">
                                    💾 Save Configuration
                                </button>
                                <button class="btn btn-secondary" id="test-email-config">
                                    ✉️ Send Test Email
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="current-status">
                        <h4>Current Status:</h4>
                        <div id="email-status">
                            ${this.isConfigured() ? 
                                '<span style="color: green;">✅ Email service is configured and ready!</span>' : 
                                '<span style="color: orange;">⚠️ Email service needs configuration</span>'
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        const closeModal = () => document.body.removeChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Save configuration
        modal.querySelector('#save-emailjs-config').addEventListener('click', async () => {
            const serviceId = modal.querySelector('#emailjs-service-id').value.trim();
            const templateId = modal.querySelector('#emailjs-template-id').value.trim();
            const publicKey = modal.querySelector('#emailjs-public-key').value.trim();
            
            if (!serviceId || !templateId || !publicKey) {
                toast.error('Please fill in all configuration fields');
                return;
            }
            
            try {
                // Save to localStorage
                const config = { serviceId, templateId, publicKey };
                localStorage.setItem('invoiceApp:emailConfig', JSON.stringify(config));
                
                // Initialize service
                await this.initialize(config);
                
                toast.success('Email service configured successfully!');
                modal.querySelector('#email-status').innerHTML = 
                    '<span style="color: green;">✅ Email service is configured and ready!</span>';
                    
            } catch (error) {
                toast.error('Configuration failed: ' + error.message);
            }
        });
        
        // Test email
        modal.querySelector('#test-email-config').addEventListener('click', async () => {
            if (!this.isConfigured()) {
                toast.error('Please save configuration first');
                return;
            }
            
            try {
                const testData = {
                    to_email: this.settings.companyEmail || 'test@example.com',
                    to_name: 'Test User',
                    subject: 'EmailJS Test - Invoice Automation',
                    message: 'This is a test email from your Invoice Automation app. If you received this, your email service is working correctly!',
                    company_name: this.settings.companyName || 'Your Company',
                    company_email: this.settings.companyEmail || '',
                    invoice_id: 'TEST-001',
                    invoice_amount: '$100.00',
                    due_date: new Date().toLocaleDateString()
                };
                
                const result = await emailjs.send(
                    this.config.serviceId,
                    this.config.templateId,
                    testData,
                    this.config.publicKey
                );
                
                if (result.status === 200) {
                    toast.success('Test email sent successfully! Check your inbox.');
                } else {
                    toast.error('Test email failed: ' + result.text);
                }
            } catch (error) {
                toast.error('Test email failed: ' + error.message);
            }
        });
        
        // Load existing config
        const savedConfig = localStorage.getItem('invoiceApp:emailConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            modal.querySelector('#emailjs-service-id').value = config.serviceId || '';
            modal.querySelector('#emailjs-template-id').value = config.templateId || '';
            modal.querySelector('#emailjs-public-key').value = config.publicKey || '';
        }

        document.body.appendChild(modal);
    }

    /**
     * Quick setup with guided steps
     */
    async quickSetup() {
        // Load saved configuration if exists
        const savedConfig = localStorage.getItem('invoiceApp:emailConfig');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                await this.initialize(config);
                return true;
            } catch (error) {
                console.warn('Saved email config is invalid:', error);
            }
        }
        
        return false;
    }
}

// Create and export service instance
const realEmailService = new RealEmailService();

// Auto-initialize with saved config
realEmailService.quickSetup().catch(console.warn);

export default realEmailService;
