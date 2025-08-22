// Email functionality for sending invoices
import { CurrencyFormatter, DateUtils } from './ui.js';
import store from './store.js';
import { exportToPDF, generatePaymentLink } from './export.js';

/**
 * Email service for sending invoices
 */
export class EmailService {
    constructor() {
        this.settings = store.getSettings();
    }

    /**
     * Send invoice via email using mailto (default email client)
     * @param {Object} invoice - Invoice to send
     * @param {Object} options - Email options
     * @returns {Promise<boolean>} Success status
     */
    async sendInvoiceViaMailto(invoice, options = {}) {
        try {
            const client = store.getClient(invoice.clientId);
            if (!client || !client.email) {
                throw new Error('Client email address not found');
            }

            const emailData = this.prepareEmailData(invoice, client, options);
            const mailtoUrl = this.createMailtoUrl(emailData);
            
            // Open default email client
            window.location.href = mailtoUrl;
            
            return true;
        } catch (error) {
            console.error('Email sending failed:', error);
            throw error;
        }
    }

    /**
     * Send invoice via Gmail web interface
     * @param {Object} invoice - Invoice to send
     * @param {Object} options - Email options
     * @returns {Promise<boolean>} Success status
     */
    async sendInvoiceViaGmail(invoice, options = {}) {
        try {
            const client = store.getClient(invoice.clientId);
            if (!client || !client.email) {
                throw new Error('Client email address not found');
            }

            const emailData = this.prepareEmailData(invoice, client, options);
            const gmailUrl = this.createGmailComposeUrl(emailData);
            
            // Open Gmail compose window
            window.open(gmailUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
            
            return true;
        } catch (error) {
            console.error('Gmail sending failed:', error);
            throw error;
        }
    }

    /**
     * Send invoice with PDF attachment (requires user to download PDF first)
     * @param {Object} invoice - Invoice to send
     * @param {Object} options - Email options
     * @returns {Promise<boolean>} Success status
     */
    async sendInvoiceWithAttachment(invoice, options = {}) {
        try {
            const client = store.getClient(invoice.clientId);
            if (!client || !client.email) {
                throw new Error('Client email address not found');
            }

            // First generate the PDF
            await exportToPDF(invoice);
            
            // Then prepare email
            const emailData = this.prepareEmailData(invoice, client, {
                ...options,
                includeAttachmentNote: true
            });
            
            const mailtoUrl = this.createMailtoUrl(emailData);
            
            // Small delay to ensure PDF download started
            setTimeout(() => {
                window.location.href = mailtoUrl;
            }, 1000);
            
            return true;
        } catch (error) {
            console.error('Email with attachment failed:', error);
            throw error;
        }
    }

    /**
     * Prepare email data for sending
     * @param {Object} invoice - Invoice object
     * @param {Object} client - Client object
     * @param {Object} options - Email options
     * @returns {Object} Email data
     */
    prepareEmailData(invoice, client, options = {}) {
        const settings = store.getSettings();
        const formatter = new CurrencyFormatter(settings.currency);
        
        const subject = options.subject || `Invoice ${invoice.id} - ${formatter.format(invoice.totals.grand)}`;
        
        const body = options.customMessage || this.generateDefaultEmailBody(invoice, client, formatter, options);
        
        return {
            to: client.email,
            cc: options.cc || '',
            bcc: options.bcc || '',
            subject,
            body
        };
    }

    /**
     * Generate default email body
     * @param {Object} invoice - Invoice object
     * @param {Object} client - Client object
     * @param {CurrencyFormatter} formatter - Currency formatter
     * @param {Object} options - Email options
     * @returns {string} Email body
     */
    generateDefaultEmailBody(invoice, client, formatter, options = {}) {
        const settings = store.getSettings();
        const companyName = settings.companyName || 'Your Company';
        
        let body = `Dear ${client.name},

I hope this email finds you well.

Please find attached invoice ${invoice.id} for the services rendered. Here are the details:

Invoice Details:
• Invoice Number: ${invoice.id}
• Issue Date: ${DateUtils.formatDate(invoice.issueDate)}
• Due Date: ${DateUtils.formatDate(invoice.dueDate)}
• Amount Due: ${formatter.format(invoice.totals.grand)}
• Payment Terms: ${invoice.terms}

`;

        // Add payment instructions if available
        if (options.includePaymentInstructions) {
            body += `Payment Instructions:
Please remit payment by ${DateUtils.formatDate(invoice.dueDate)} using your preferred method.

`;
        }

        // Add attachment note if PDF was generated
        if (options.includeAttachmentNote) {
            body += `Note: The invoice PDF should have been downloaded to your computer. Please attach it to this email before sending.

`;
        }

        // Add items summary
        if (invoice.items && invoice.items.length > 0) {
            body += `Services/Items:
`;
            invoice.items.forEach(item => {
                const totals = item.calculateTotals();
                body += `• ${item.description} - ${formatter.format(totals.total)}\n`;
            });
            body += `\n`;
        }

        body += `Thank you for your business. If you have any questions about this invoice, please don't hesitate to contact me.

Best regards,
${companyName}`;

        if (settings.companyEmail) {
            body += `\n${settings.companyEmail}`;
        }
        if (settings.companyPhone) {
            body += `\n${settings.companyPhone}`;
        }

        return body;
    }

    /**
     * Create mailto URL
     * @param {Object} emailData - Email data
     * @returns {string} Mailto URL
     */
    createMailtoUrl(emailData) {
        const params = new URLSearchParams();
        
        if (emailData.cc) params.set('cc', emailData.cc);
        if (emailData.bcc) params.set('bcc', emailData.bcc);
        params.set('subject', emailData.subject);
        params.set('body', emailData.body);
        
        return `mailto:${emailData.to}?${params.toString()}`;
    }

    /**
     * Create Gmail compose URL
     * @param {Object} emailData - Email data
     * @returns {string} Gmail compose URL
     */
    createGmailComposeUrl(emailData) {
        const params = new URLSearchParams();
        params.set('to', emailData.to);
        if (emailData.cc) params.set('cc', emailData.cc);
        if (emailData.bcc) params.set('bcc', emailData.bcc);
        params.set('subject', emailData.subject);
        params.set('body', emailData.body);
        
        return `https://mail.google.com/mail/?view=cm&${params.toString()}`;
    }

    /**
     * Validate email addresses
     * @param {string} emails - Comma-separated email addresses
     * @returns {boolean} Are all emails valid
     */
    validateEmails(emails) {
        if (!emails) return true;
        
        const emailList = emails.split(',').map(email => email.trim());
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        return emailList.every(email => emailRegex.test(email));
    }

    /**
     * Send payment reminder
     * @param {Object} invoice - Invoice object
     * @param {Object} options - Email options
     * @returns {Promise<boolean>} Success status
     */
    async sendPaymentReminder(invoice, options = {}) {
        const client = store.getClient(invoice.clientId);
        if (!client || !client.email) {
            throw new Error('Client email address not found');
        }

        const formatter = new CurrencyFormatter(store.getSettings().currency);
        const daysOverdue = Math.floor((Date.now() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));
        
        const reminderSubject = `Payment Reminder: Invoice ${invoice.id} - ${daysOverdue > 0 ? 'Overdue' : 'Due Soon'}`;
        
        const reminderBody = `Dear ${client.name},

This is a friendly reminder about invoice ${invoice.id}.

Invoice Details:
• Invoice Number: ${invoice.id}
• Issue Date: ${DateUtils.formatDate(invoice.issueDate)}
• Due Date: ${DateUtils.formatDate(invoice.dueDate)}
• Amount Due: ${formatter.format(invoice.totals.grand)}
${daysOverdue > 0 ? `• Days Overdue: ${daysOverdue}` : ''}

${daysOverdue > 0 
    ? 'This invoice is now overdue. Please arrange payment at your earliest convenience.' 
    : 'This invoice is due soon. Please ensure payment is made by the due date.'}

If you have already made this payment, please disregard this reminder.

If you have any questions or concerns, please contact me immediately.

Thank you for your prompt attention to this matter.

Best regards,
${store.getSettings().companyName || 'Your Company'}`;

        const emailData = {
            to: client.email,
            cc: options.cc || '',
            bcc: options.bcc || '',
            subject: reminderSubject,
            body: reminderBody
        };

        const mailtoUrl = this.createMailtoUrl(emailData);
        window.location.href = mailtoUrl;
        
        return true;
    }
}

// Export default instance
export default new EmailService();
