// Gmail API Integration for Real Email Delivery
import { CurrencyFormatter, DateUtils, toast } from './ui.js';
import store from './store.js';

/**
 * Gmail API Email Service
 * Sends emails directly through Gmail API
 */
export class GmailAPIService {
    constructor() {
        this.settings = store.getSettings();
        this.isSignedIn = false;
        this.gapi = null;
        this.config = {
            apiKey: '', // Will be set during initialization
            clientId: '', // Will be set during initialization
            discoveryDoc: 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
            scopes: 'https://www.googleapis.com/auth/gmail.send'
        };
    }

    /**
     * Initialize Gmail API
     * @param {Object} config - Gmail API configuration
     */
    async initialize(config = {}) {
        try {
            // Set configuration
            if (config.apiKey) this.config.apiKey = config.apiKey;
            if (config.clientId) this.config.clientId = config.clientId;

            if (!this.config.apiKey || !this.config.clientId) {
                throw new Error('Gmail API credentials not configured');
            }

            // Load Google API
            await this.loadGoogleAPI();
            
            // Initialize gapi with proper promise handling
            await new Promise((resolve, reject) => {
                gapi.load('client:auth2', async () => {
                    try {
                        await gapi.client.init({
                            apiKey: this.config.apiKey,
                            clientId: this.config.clientId,
                            discoveryDocs: [this.config.discoveryDoc],
                            scope: this.config.scopes
                        });

                        this.gapi = gapi;
                        
                        // Check if user is already signed in
                        const authInstance = gapi.auth2.getAuthInstance();
                        this.isSignedIn = authInstance.isSignedIn.get();
                        
                        console.log('Gmail API initialized successfully');
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            return true;
        } catch (error) {
            console.error('Failed to initialize Gmail API:', error);
            throw error;
        }
    }

    /**
     * Load Google API library
     */
    loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Sign in to Gmail
     */
    async signIn() {
        if (!this.gapi) {
            throw new Error('Gmail API not initialized');
        }

        try {
            const authInstance = this.gapi.auth2.getAuthInstance();
            const user = await authInstance.signIn();
            this.isSignedIn = true;
            
            const profile = user.getBasicProfile();
            
            // Verify we have the required scope
            const hasScope = user.hasGrantedScopes(this.config.scopes);
            if (!hasScope) {
                throw new Error('Gmail send permission not granted');
            }
            
            return {
                email: profile.getEmail(),
                name: profile.getName(),
                picture: profile.getImageUrl()
            };
        } catch (error) {
            console.error('Gmail sign-in failed:', error);
            this.isSignedIn = false;
            throw new Error('Failed to sign in to Gmail: ' + error.message);
        }
    }

    /**
     * Sign out from Gmail
     */
    async signOut() {
        if (!this.gapi) return;

        try {
            const authInstance = this.gapi.auth2.getAuthInstance();
            await authInstance.signOut();
            this.isSignedIn = false;
        } catch (error) {
            console.error('Gmail sign-out failed:', error);
        }
    }

    /**
     * Check if Gmail API is configured
     */
    isConfigured() {
        return this.config.apiKey && this.config.clientId && this.gapi !== null;
    }

    /**
     * Get initialization status
     */
    getStatus() {
        return {
            configured: this.isConfigured(),
            signedIn: this.isUserSignedIn(),
            user: this.getCurrentUser()
        };
    }

    /**
     * Check if user is signed in
     */
    isUserSignedIn() {
        if (!this.gapi) return false;
        
        try {
            const authInstance = this.gapi.auth2.getAuthInstance();
            return authInstance && authInstance.isSignedIn.get();
        } catch (error) {
            console.warn('Error checking sign-in status:', error);
            return false;
        }
    }

    /**
     * Get current user info
     */
    getCurrentUser() {
        if (!this.gapi || !this.isSignedIn) {
            return null;
        }

        const authInstance = this.gapi.auth2.getAuthInstance();
        const user = authInstance.currentUser.get();
        const profile = user.getBasicProfile();

        return {
            email: profile.getEmail(),
            name: profile.getName(),
            picture: profile.getImageUrl()
        };
    }

    /**
     * Send invoice email via Gmail API
     * @param {Object} invoice - Invoice to send
     * @param {Object} options - Email options
     */
    async sendInvoiceEmail(invoice, options = {}) {
        if (!this.isSignedIn) {
            throw new Error('Please sign in to Gmail first');
        }

        const client = store.getClient(invoice.clientId);
        if (!client || !client.email) {
            throw new Error('Client email address not found');
        }

        try {
            const emailData = this.prepareInvoiceEmailData(invoice, client, options);
            const message = this.createEmailMessage(emailData);
            
            const response = await gapi.client.gmail.users.messages.send({
                userId: 'me',
                resource: {
                    raw: message
                }
            });

            if (response.status === 200) {
                this.logEmailSent(invoice.id, client.email, 'invoice');
                return {
                    success: true,
                    message: `Invoice sent successfully to ${client.email}`,
                    messageId: response.result.id
                };
            } else {
                throw new Error('Failed to send email');
            }
        } catch (error) {
            console.error('Gmail API send failed:', error);
            throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Send payment reminder via Gmail API
     * @param {Object} invoice - Invoice for reminder
     * @param {Object} options - Email options
     */
    async sendPaymentReminder(invoice, options = {}) {
        if (!this.isSignedIn) {
            throw new Error('Please sign in to Gmail first');
        }

        const client = store.getClient(invoice.clientId);
        if (!client || !client.email) {
            throw new Error('Client email address not found');
        }

        try {
            const emailData = this.prepareReminderEmailData(invoice, client, options);
            const message = this.createEmailMessage(emailData);
            
            const response = await gapi.client.gmail.users.messages.send({
                userId: 'me',
                resource: {
                    raw: message
                }
            });

            if (response.status === 200) {
                this.logEmailSent(invoice.id, client.email, 'reminder');
                return {
                    success: true,
                    message: `Payment reminder sent to ${client.email}`,
                    messageId: response.result.id
                };
            } else {
                throw new Error('Failed to send reminder');
            }
        } catch (error) {
            console.error('Gmail API reminder send failed:', error);
            throw new Error(`Failed to send reminder: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Create RFC 2822 formatted email message
     * @param {Object} emailData - Email data
     * @returns {string} Base64 encoded email message
     */
    createEmailMessage(emailData) {
        const boundary = '----=_NextPart_' + Math.random().toString(36).substr(2, 9);
        
        const messageParts = [
            `To: ${emailData.to}`,
            `Subject: ${emailData.subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/plain; charset=utf-8`,
            '',
            emailData.body
        ];

        const message = messageParts.join('\r\n');
        
        // Convert to base64url format (Gmail API requirement)
        return btoa(message)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    /**
     * Prepare invoice email data
     */
    prepareInvoiceEmailData(invoice, client, options = {}) {
        const settings = store.getSettings();
        const formatter = new CurrencyFormatter(settings.currency);
        
        return {
            to: client.email,
            subject: options.subject || `Invoice ${invoice.id} - ${formatter.format(invoice.totals.grand)}`,
            body: options.message || this.generateInvoiceEmailBody(invoice, client, formatter)
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
            to: client.email,
            subject: options.subject || `Payment Reminder: Invoice ${invoice.id} - ${daysOverdue > 0 ? 'OVERDUE' : 'Due Soon'}`,
            body: options.message || this.generateReminderEmailBody(invoice, client, formatter, daysOverdue)
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
     * Log successful email send
     */
    logEmailSent(invoiceId, email, type) {
        const logs = JSON.parse(localStorage.getItem('invoiceApp:emailLogs') || '[]');
        logs.push({
            invoiceId,
            email,
            type,
            timestamp: new Date().toISOString(),
            status: 'sent',
            method: 'gmail-api'
        });
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('invoiceApp:emailLogs', JSON.stringify(logs));
    }

    /**
     * Show Gmail API setup guide
     */
    showSetupGuide() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>📧 Setup Gmail API Integration</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
                    <div class="setup-steps">
                        <div class="step">
                            <h4>Step 1: Create Google Cloud Project</h4>
                            <p>1. Go to <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a></p>
                            <p>2. Create a new project or select existing one</p>
                            <p>3. Enable the Gmail API for your project</p>
                        </div>
                        
                        <div class="step">
                            <h4>Step 2: Create Credentials</h4>
                            <p>1. Go to "APIs & Services" → "Credentials"</p>
                            <p>2. Click "Create Credentials" → "API Key"</p>
                            <p>3. Copy your <strong>API Key</strong></p>
                            <p>4. Click "Create Credentials" → "OAuth client ID"</p>
                            <p>5. Choose "Web application"</p>
                            <p>6. Add your domain to authorized origins</p>
                            <p>7. Copy your <strong>Client ID</strong></p>
                        </div>
                        
                        <div class="step">
                            <h4>Step 3: Configure OAuth Consent</h4>
                            <p>1. Go to "OAuth consent screen"</p>
                            <p>2. Fill in required information</p>
                            <p>3. Add your email to test users</p>
                            <p>4. Add Gmail send scope: https://www.googleapis.com/auth/gmail.send</p>
                        </div>
                        
                        <div class="step">
                            <h4>Step 4: Configure This App</h4>
                            <div class="config-form">
                                <div class="form-group">
                                    <label>API Key:</label>
                                    <input type="text" id="gmail-api-key" placeholder="AIzaSyC...">
                                </div>
                                <div class="form-group">
                                    <label>Client ID:</label>
                                    <input type="text" id="gmail-client-id" placeholder="123456789-abc.apps.googleusercontent.com">
                                </div>
                                <button class="btn btn-primary" id="save-gmail-config">
                                    💾 Save Configuration
                                </button>
                                <button class="btn btn-secondary" id="test-gmail-signin">
                                    🔐 Test Sign-In
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="current-status">
                        <h4>Current Status:</h4>
                        <div id="gmail-status">
                            ${(() => {
                                const status = this.getStatus();
                                if (status.signedIn && status.user) {
                                    return `<span style="color: green;">✅ Gmail API configured and signed in as ${status.user.email}!</span>`;
                                } else if (status.configured) {
                                    return '<span style="color: orange;">⚙️ Gmail API configured but not signed in. Click "Test Sign-In" below.</span>';
                                } else {
                                    return '<span style="color: orange;">⚠️ Gmail API needs configuration</span>';
                                }
                            })()}
                        </div>
                    </div>
                    
                    <div class="benefits">
                        <h4>Benefits of Gmail API:</h4>
                        <ul>
                            <li>✅ Send from your own Gmail account</li>
                            <li>✅ Emails appear in your Sent folder</li>
                            <li>✅ Professional email delivery</li>
                            <li>✅ No third-party dependencies</li>
                            <li>✅ Free Gmail quotas (250 emails/day)</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        const closeModal = () => document.body.removeChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Save configuration
        modal.querySelector('#save-gmail-config').addEventListener('click', async () => {
            const apiKey = modal.querySelector('#gmail-api-key').value.trim();
            const clientId = modal.querySelector('#gmail-client-id').value.trim();
            
            if (!apiKey || !clientId) {
                toast.error('Please fill in both API Key and Client ID');
                return;
            }
            
            // Show loading state
            const saveBtn = modal.querySelector('#save-gmail-config');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '⏳ Initializing...';
            saveBtn.disabled = true;
            
            try {
                // Save to localStorage
                const config = { apiKey, clientId };
                localStorage.setItem('invoiceApp:gmailConfig', JSON.stringify(config));
                
                // Initialize service
                await this.initialize(config);
                
                toast.success('Gmail API configured successfully!');
                modal.querySelector('#gmail-status').innerHTML = 
                    '<span style="color: green;">✅ Gmail API is configured! Click "Test Sign-In" to authenticate.</span>';
                    
            } catch (error) {
                console.error('Gmail API initialization error:', error);
                toast.error('Configuration failed: ' + error.message);
                
                // Show specific error guidance
                if (error.message.includes('API key')) {
                    modal.querySelector('#gmail-status').innerHTML = 
                        '<span style="color: red;">❌ Invalid API Key. Please check your Google Cloud Console.</span>';
                } else if (error.message.includes('client')) {
                    modal.querySelector('#gmail-status').innerHTML = 
                        '<span style="color: red;">❌ Invalid Client ID. Please check your OAuth configuration.</span>';
                } else {
                    modal.querySelector('#gmail-status').innerHTML = 
                        '<span style="color: red;">❌ Configuration failed. Please check your credentials.</span>';
                }
            } finally {
                // Restore button state
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            }
        });
        
        // Test sign-in
        modal.querySelector('#test-gmail-signin').addEventListener('click', async () => {
            const signInBtn = modal.querySelector('#test-gmail-signin');
            const originalText = signInBtn.textContent;
            
            try {
                signInBtn.textContent = '🔄 Signing in...';
                signInBtn.disabled = true;
                
                const user = await this.signIn();
                toast.success(`Successfully signed in as ${user.email}!`);
                modal.querySelector('#gmail-status').innerHTML = 
                    `<span style="color: green;">✅ Signed in as ${user.email} - Ready to send emails!</span>`;
                    
                // Update button to show sign-out option
                signInBtn.textContent = '🔓 Sign Out';
                signInBtn.onclick = async () => {
                    await this.signOut();
                    modal.querySelector('#gmail-status').innerHTML = 
                        '<span style="color: orange;">⚠️ Signed out. Click "Test Sign-In" to authenticate again.</span>';
                    signInBtn.textContent = '🔐 Test Sign-In';
                    signInBtn.onclick = null; // Reset to original handler
                };
                
            } catch (error) {
                console.error('Gmail sign-in error:', error);
                toast.error('Sign-in failed: ' + error.message);
                
                // Show specific error guidance
                if (error.message.includes('popup')) {
                    modal.querySelector('#gmail-status').innerHTML = 
                        '<span style="color: red;">❌ Sign-in popup was blocked. Please allow popups for this site.</span>';
                } else if (error.message.includes('permission')) {
                    modal.querySelector('#gmail-status').innerHTML = 
                        '<span style="color: red;">❌ Gmail send permission not granted. Please accept all permissions.</span>';
                } else {
                    modal.querySelector('#gmail-status').innerHTML = 
                        '<span style="color: red;">❌ Sign-in failed. Please check your OAuth consent screen configuration.</span>';
                }
            } finally {
                if (signInBtn.textContent === '🔄 Signing in...') {
                    signInBtn.textContent = originalText;
                    signInBtn.disabled = false;
                }
            }
        });
        
        // Load existing config
        const savedConfig = localStorage.getItem('invoiceApp:gmailConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            modal.querySelector('#gmail-api-key').value = config.apiKey || '';
            modal.querySelector('#gmail-client-id').value = config.clientId || '';
        }

        document.body.appendChild(modal);
    }

    /**
     * Quick setup with saved config
     */
    async quickSetup() {
        const savedConfig = localStorage.getItem('invoiceApp:gmailConfig');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                await this.initialize(config);
                return true;
            } catch (error) {
                console.warn('Saved Gmail config is invalid:', error);
            }
        }
        return false;
    }
}

// Create and export service instance
const gmailAPIService = new GmailAPIService();

// Auto-initialize with saved config
gmailAPIService.quickSetup().catch(console.warn);

export default gmailAPIService;
