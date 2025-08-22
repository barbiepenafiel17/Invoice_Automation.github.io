// Advanced Email Integration Service
import { CurrencyFormatter, DateUtils } from './ui.js';
import store from './store.js';
import { exportToPDF, generatePaymentLink } from './export.js';

/**
 * Advanced Email Service with multiple sending options
 */
export class AdvancedEmailService {
    constructor() {
        this.settings = store.getSettings();
    }

    /**
     * Send email using EmailJS (requires setup)
     * @param {Object} invoice - Invoice to send
     * @param {Object} options - Email options
     * @returns {Promise<boolean>} Success status
     */
    async sendViaEmailJS(invoice, options = {}) {
        if (!window.emailjs) {
            throw new Error('EmailJS library not loaded. Please add EmailJS to your project.');
        }

        const client = store.getClient(invoice.clientId);
        if (!client || !client.email) {
            throw new Error('Client email address not found');
        }

        try {
            const emailData = this.prepareEmailData(invoice, client, options);
            
            // EmailJS template parameters
            const templateParams = {
                to_email: client.email,
                client_name: client.name,
                invoice_id: invoice.id,
                invoice_amount: new CurrencyFormatter(this.settings.currency).format(invoice.totals.grand),
                issue_date: DateUtils.formatDate(invoice.issueDate),
                due_date: DateUtils.formatDate(invoice.dueDate),
                payment_terms: invoice.terms,
                company_name: this.settings.companyName || 'Your Company',
                company_email: this.settings.companyEmail || '',
                email_content: emailData.body
            };

            // Send email via EmailJS (requires service ID, template ID, and user ID)
            const result = await emailjs.send(
                'your_service_id', // Replace with your EmailJS service ID
                'invoice_template', // Replace with your EmailJS template ID
                templateParams,
                'your_user_id' // Replace with your EmailJS user ID
            );

            return result.status === 200;
        } catch (error) {
            console.error('EmailJS send failed:', error);
            throw error;
        }
    }

    /**
     * Send email using Formspree
     * @param {Object} invoice - Invoice to send
     * @param {Object} options - Email options
     * @returns {Promise<boolean>} Success status
     */
    async sendViaFormspree(invoice, options = {}) {
        const client = store.getClient(invoice.clientId);
        if (!client || !client.email) {
            throw new Error('Client email address not found');
        }

        try {
            const emailData = this.prepareEmailData(invoice, client, options);
            
            // Formspree endpoint (replace with your form ID)
            const formspreeEndpoint = 'https://formspree.io/f/your-form-id';
            
            const formData = new FormData();
            formData.append('_to', client.email);
            formData.append('_subject', emailData.subject);
            formData.append('message', emailData.body);
            formData.append('_replyto', this.settings.companyEmail || '');

            const response = await fetch(formspreeEndpoint, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Formspree send failed:', error);
            throw error;
        }
    }

    /**
     * Send via Web Share API (mobile/desktop sharing)
     * @param {Object} invoice - Invoice to send
     * @param {Object} options - Email options
     * @returns {Promise<boolean>} Success status
     */
    async sendViaWebShare(invoice, options = {}) {
        if (!navigator.share) {
            throw new Error('Web Share API not supported on this device');
        }

        const client = store.getClient(invoice.clientId);
        if (!client || !client.email) {
            throw new Error('Client email address not found');
        }

        try {
            const emailData = this.prepareEmailData(invoice, client, options);
            
            await navigator.share({
                title: emailData.subject,
                text: `Send this invoice to: ${client.email}\n\n${emailData.body}`,
                url: window.location.href
            });

            return true;
        } catch (error) {
            if (error.name === 'AbortError') {
                // User cancelled sharing
                return false;
            }
            console.error('Web Share failed:', error);
            throw error;
        }
    }

    /**
     * Copy email content to clipboard with instructions
     * @param {Object} invoice - Invoice to send
     * @param {Object} options - Email options
     * @returns {Promise<boolean>} Success status
     */
    async copyEmailToClipboard(invoice, options = {}) {
        const client = store.getClient(invoice.clientId);
        if (!client || !client.email) {
            throw new Error('Client email address not found');
        }

        try {
            const emailData = this.prepareEmailData(invoice, client, options);
            
            const fullEmailContent = `TO: ${client.email}
SUBJECT: ${emailData.subject}

${emailData.body}`;

            await navigator.clipboard.writeText(fullEmailContent);
            return true;
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            const emailData = this.prepareEmailData(invoice, client, options);
            textArea.value = `TO: ${client.email}\nSUBJECT: ${emailData.subject}\n\n${emailData.body}`;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    }

    /**
     * Create a shareable email link with WhatsApp, Telegram, etc.
     * @param {Object} invoice - Invoice to send
     * @param {Object} options - Email options
     * @returns {Object} Social sharing URLs
     */
    createSocialShareLinks(invoice, options = {}) {
        const client = store.getClient(invoice.clientId);
        if (!client || !client.email) {
            throw new Error('Client email address not found');
        }

        const emailData = this.prepareEmailData(invoice, client, options);
        const formatter = new CurrencyFormatter(this.settings.currency);
        
        const shortMessage = `Hi ${client.name}, please find attached invoice ${invoice.id} for ${formatter.format(invoice.totals.grand)}. Due: ${DateUtils.formatDate(invoice.dueDate)}`;
        
        const encodedMessage = encodeURIComponent(shortMessage);
        const encodedEmail = encodeURIComponent(client.email);
        
        return {
            whatsapp: `https://wa.me/?text=${encodedMessage}`,
            telegram: `https://t.me/share/url?text=${encodedMessage}`,
            sms: `sms:?body=${encodedMessage}`,
            email: `mailto:${client.email}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`
        };
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

Please find the invoice details below:

Invoice Details:
• Invoice Number: ${invoice.id}
• Issue Date: ${DateUtils.formatDate(invoice.issueDate)}
• Due Date: ${DateUtils.formatDate(invoice.dueDate)}
• Amount Due: ${formatter.format(invoice.totals.grand)}
• Payment Terms: ${invoice.terms}

`;

        // Add items summary
        if (invoice.items && invoice.items.length > 0) {
            body += `Services/Items:\n`;
            invoice.items.forEach(item => {
                const totals = item.calculateTotals();
                body += `• ${item.description} - ${formatter.format(totals.total)}\n`;
            });
            body += `\n`;
        }

        // Add payment instructions
        body += `Payment Instructions:
Please remit payment by ${DateUtils.formatDate(invoice.dueDate)}. 

`;

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
}

// Export default instance
export default new AdvancedEmailService();
