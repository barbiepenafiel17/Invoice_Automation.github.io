// Invoice Builder Logic and Calculations
import { Invoice, LineItem } from './models.js';
import { AutoSave, toast, CurrencyFormatter } from './ui.js';
import store from './store.js';

export class InvoiceBuilder {
    constructor() {
        this.currentInvoice = new Invoice();
        this.currencyFormatter = new CurrencyFormatter();
        this.autoSave = new AutoSave(this.saveInvoice.bind(this));
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize invoice builder
     */
    init() {
        if (this.isInitialized) return;
        
        this.bindEvents();
        this.loadClients();
        this.generateNewInvoice();
        this.updatePreview();
        
        this.isInitialized = true;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Invoice details
        document.getElementById('issue-date')?.addEventListener('change', this.handleDateChange.bind(this));
        document.getElementById('due-date')?.addEventListener('change', this.handleDateChange.bind(this));
        document.getElementById('payment-terms')?.addEventListener('change', this.handleTermsChange.bind(this));
        
        // Client selection
        document.getElementById('client-select')?.addEventListener('change', this.handleClientChange.bind(this));
        
        // Line items
        document.getElementById('add-item-btn')?.addEventListener('click', this.addLineItem.bind(this));
        
        // Additional details
        document.getElementById('shipping-cost')?.addEventListener('input', this.handleInputChange.bind(this));
        document.getElementById('invoice-notes')?.addEventListener('input', this.handleInputChange.bind(this));
        
        // Recurring settings
        document.getElementById('recurring-enabled')?.addEventListener('change', this.handleRecurringToggle.bind(this));
        document.getElementById('recurring-interval')?.addEventListener('change', this.handleInputChange.bind(this));
        document.getElementById('next-run-date')?.addEventListener('change', this.handleInputChange.bind(this));
        
        // Actions
        document.getElementById('save-invoice-btn')?.addEventListener('click', this.handleSaveInvoice.bind(this));
        document.getElementById('duplicate-invoice-btn')?.addEventListener('click', this.handleDuplicateInvoice.bind(this));
        document.getElementById('export-pdf-btn')?.addEventListener('click', this.handleExportPDF.bind(this));

        // Email button event listeners
        document.getElementById('send-email-btn')?.addEventListener('click', this.handleSendEmail.bind(this));
        document.getElementById('send-gmail-btn')?.addEventListener('click', this.handleSendGmail.bind(this));
        document.getElementById('send-attachment-btn')?.addEventListener('click', this.handleSendWithAttachment.bind(this));
        document.getElementById('copy-email-btn')?.addEventListener('click', this.handleCopyEmail.bind(this));
        document.getElementById('share-social-btn')?.addEventListener('click', this.handleSocialShare.bind(this));
        document.getElementById('send-reminder-btn')?.addEventListener('click', this.handleSendReminder.bind(this));
        document.getElementById('email-setup-btn')?.addEventListener('click', this.handleEmailSetup.bind(this));

        // Dropdown toggle functionality
        document.getElementById('email-options-btn')?.addEventListener('click', this.handleEmailDropdownToggle.bind(this));
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-group')) {
                document.getElementById('email-dropdown')?.classList.remove('show');
            }
        });
    }

    /**
     * Generate new invoice
     */
    generateNewInvoice() {
        this.currentInvoice = new Invoice();
        this.currentInvoice.id = ''; // Will be generated on save
        
        // Set default values
        const settings = store.getSettings();
        this.currencyFormatter.setCurrency(settings.currency);
        
        // Update form
        document.getElementById('invoice-number').value = 'Will be generated';
        document.getElementById('issue-date').value = this.currentInvoice.issueDate;
        document.getElementById('due-date').value = this.currentInvoice.dueDate;
        document.getElementById('payment-terms').value = this.currentInvoice.terms;
        document.getElementById('shipping-cost').value = '0.00';
        document.getElementById('invoice-notes').value = '';
        document.getElementById('recurring-enabled').checked = false;
        document.getElementById('recurring-options').style.display = 'none';
        
        // Clear line items
        this.renderLineItems();
        
        // Add first line item
        this.addLineItem();
        
        this.updatePreview();
    }

    /**
     * Load invoice for editing
     * @param {string} invoiceId - Invoice ID to load
     */
    loadInvoice(invoiceId) {
        const invoice = store.getInvoice(invoiceId);
        if (!invoice) {
            toast.error('Invoice not found');
            return;
        }

        this.currentInvoice = new Invoice(invoice);
        this.populateForm();
        this.renderLineItems();
        this.updatePreview();
        
        toast.success('Invoice loaded');
    }

    /**
     * Populate form with current invoice data
     */
    populateForm() {
        document.getElementById('invoice-number').value = this.currentInvoice.id || 'Will be generated';
        document.getElementById('issue-date').value = this.currentInvoice.issueDate;
        document.getElementById('due-date').value = this.currentInvoice.dueDate;
        document.getElementById('payment-terms').value = this.currentInvoice.terms;
        document.getElementById('client-select').value = this.currentInvoice.clientId;
        document.getElementById('shipping-cost').value = this.currentInvoice.shipping.toFixed(2);
        document.getElementById('invoice-notes').value = this.currentInvoice.notes;
        
        // Recurring settings
        const recurringEnabled = document.getElementById('recurring-enabled');
        recurringEnabled.checked = this.currentInvoice.recurring.enabled;
        this.handleRecurringToggle({ target: recurringEnabled });
        
        if (this.currentInvoice.recurring.enabled) {
            document.getElementById('recurring-interval').value = this.currentInvoice.recurring.interval;
            document.getElementById('next-run-date').value = this.currentInvoice.recurring.nextRun || '';
        }
        
        this.handleClientChange();
    }

    /**
     * Load clients into select dropdown
     */
    loadClients() {
        const clientSelect = document.getElementById('client-select');
        const clients = store.getClients();
        
        clientSelect.innerHTML = '<option value="">Select a client...</option>';
        
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            
            // Show email status in client name
            let displayName = client.company ? `${client.name} (${client.company})` : client.name;
            if (client.email) {
                displayName += ' ✉️';
            } else {
                displayName += ' ⚠️ No Email';
                option.style.color = '#dc3545'; // Red color for no email
                option.title = 'This client has no email address. Add one to send invoices.';
            }
            
            option.textContent = displayName;
            clientSelect.appendChild(option);
        });
    }

    /**
     * Method to be called when client options need refreshing
     */
    loadClientOptions() {
        this.loadClients();
    }

    /**
     * Handle date changes
     * @param {Event} e - Change event
     */
    handleDateChange(e) {
        const { id, value } = e.target;
        
        if (id === 'issue-date') {
            this.currentInvoice.issueDate = value;
            // Auto-update due date if payment terms are set
            const dueDate = this.currentInvoice.calculateDueDateFromTerms(value);
            document.getElementById('due-date').value = dueDate;
            this.currentInvoice.dueDate = dueDate;
        } else if (id === 'due-date') {
            this.currentInvoice.dueDate = value;
        }
        
        this.triggerAutoSave();
        this.updatePreview();
    }

    /**
     * Handle payment terms change
     * @param {Event} e - Change event
     */
    handleTermsChange(e) {
        this.currentInvoice.terms = e.target.value;
        
        // Auto-update due date
        const issueDate = document.getElementById('issue-date').value;
        const dueDate = this.currentInvoice.calculateDueDateFromTerms(issueDate);
        document.getElementById('due-date').value = dueDate;
        this.currentInvoice.dueDate = dueDate;
        
        this.triggerAutoSave();
        this.updatePreview();
    }

    /**
     * Handle client selection change
     */
    handleClientChange() {
        const clientId = document.getElementById('client-select').value;
        this.currentInvoice.clientId = clientId;
        
        const clientDetails = document.getElementById('client-details');
        
        if (clientId) {
            const client = store.getClient(clientId);
            if (client) {
                clientDetails.innerHTML = `
                    <h4>${client.name}</h4>
                    ${client.company ? `<p><strong>${client.company}</strong></p>` : ''}
                    ${client.email ? `<p>Email: ${client.email}</p>` : ''}
                    ${client.phone ? `<p>Phone: ${client.phone}</p>` : ''}
                    ${client.address ? `<p>Address:<br>${client.address.replace(/\n/g, '<br>')}</p>` : ''}
                    ${client.taxId ? `<p>VAT/TIN: ${client.taxId}</p>` : ''}
                `;
                clientDetails.style.display = 'block';
            }
        } else {
            clientDetails.style.display = 'none';
        }
        
        this.triggerAutoSave();
        this.updatePreview();
    }

    /**
     * Handle general input changes
     * @param {Event} e - Input event
     */
    handleInputChange(e) {
        const { id, value } = e.target;
        
        switch (id) {
            case 'shipping-cost':
                this.currentInvoice.shipping = parseFloat(value) || 0;
                this.currentInvoice.updateTotals();
                this.updatePreview();
                break;
            case 'invoice-notes':
                this.currentInvoice.notes = value;
                this.updatePreview();
                break;
            case 'recurring-interval':
                this.currentInvoice.recurring.interval = value;
                break;
            case 'next-run-date':
                this.currentInvoice.recurring.nextRun = value;
                break;
        }
        
        this.triggerAutoSave();
    }

    /**
     * Handle recurring toggle
     * @param {Event} e - Change event
     */
    handleRecurringToggle(e) {
        const enabled = e.target.checked;
        this.currentInvoice.recurring.enabled = enabled;
        
        const recurringOptions = document.getElementById('recurring-options');
        recurringOptions.style.display = enabled ? 'block' : 'none';
        
        if (enabled && !this.currentInvoice.recurring.nextRun) {
            // Set default next run date to next month
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const nextRunDate = nextMonth.toISOString().split('T')[0];
            document.getElementById('next-run-date').value = nextRunDate;
            this.currentInvoice.recurring.nextRun = nextRunDate;
        }
        
        this.triggerAutoSave();
    }

    /**
     * Add new line item
     */
    addLineItem() {
        const item = this.currentInvoice.addItem();
        this.renderLineItems();
        this.updatePreview();
        
        // Focus on description field of new item
        const newItemRow = document.querySelector(`[data-item-id="${item.id}"]`);
        if (newItemRow) {
            const descInput = newItemRow.querySelector('input[type="text"]');
            if (descInput) descInput.focus();
        }
    }

    /**
     * Remove line item
     * @param {string} itemId - Item ID to remove
     */
    removeLineItem(itemId) {
        this.currentInvoice.removeItem(itemId);
        this.renderLineItems();
        this.updatePreview();
        this.triggerAutoSave();
    }

    /**
     * Update line item
     * @param {string} itemId - Item ID
     * @param {string} field - Field to update
     * @param {any} value - New value
     */
    updateLineItem(itemId, field, value) {
        const updates = {};
        
        switch (field) {
            case 'description':
                updates.description = value;
                break;
            case 'qty':
                updates.qty = parseFloat(value) || 0;
                break;
            case 'unitPrice':
                updates.unitPrice = parseFloat(value) || 0;
                break;
            case 'taxRate':
                updates.taxRate = parseFloat(value) || 0;
                break;
            case 'discountRate':
                updates.discountRate = parseFloat(value) || 0;
                break;
        }
        
        this.currentInvoice.updateItem(itemId, updates);
        this.updatePreview();
        this.triggerAutoSave();
    }

    /**
     * Render line items in the form
     */
    renderLineItems() {
        const container = document.getElementById('line-items');
        container.innerHTML = '';
        
        this.currentInvoice.items.forEach((item, index) => {
            const itemRow = this.createLineItemRow(item, index);
            container.appendChild(itemRow);
        });
    }

    /**
     * Create line item row element
     * @param {LineItem} item - Line item
     * @param {number} index - Item index
     * @returns {HTMLElement} Line item row
     */
    createLineItemRow(item, index) {
        const row = document.createElement('div');
        row.className = 'line-item';
        row.dataset.itemId = item.id;
        
        row.innerHTML = `
            <div class="form-group">
                <label>Description</label>
                <input type="text" value="${item.description}" 
                       onchange="invoiceBuilder.updateLineItem('${item.id}', 'description', this.value)">
            </div>
            <div class="form-group">
                <label>Qty</label>
                <input type="number" min="0" step="0.01" value="${item.qty}" 
                       onchange="invoiceBuilder.updateLineItem('${item.id}', 'qty', this.value)">
            </div>
            <div class="form-group">
                <label>Unit Price</label>
                <input type="number" min="0" step="0.01" value="${item.unitPrice}" 
                       onchange="invoiceBuilder.updateLineItem('${item.id}', 'unitPrice', this.value)">
            </div>
            <div class="form-group">
                <label>Tax %</label>
                <input type="number" min="0" max="100" step="0.01" value="${item.taxRate}" 
                       onchange="invoiceBuilder.updateLineItem('${item.id}', 'taxRate', this.value)">
            </div>
            <div class="form-group">
                <label>Discount %</label>
                <input type="number" min="0" max="100" step="0.01" value="${item.discountRate}" 
                       onchange="invoiceBuilder.updateLineItem('${item.id}', 'discountRate', this.value)">
            </div>
            <div class="form-group">
                <label>&nbsp;</label>
                <button type="button" class="line-item-remove" 
                        onclick="invoiceBuilder.removeLineItem('${item.id}')" 
                        title="Remove item">×</button>
            </div>
        `;
        
        return row;
    }

    /**
     * Update invoice preview
     */
    updatePreview() {
        const preview = document.getElementById('invoice-preview');
        if (!preview) return;

        const client = this.currentInvoice.clientId ? store.getClient(this.currentInvoice.clientId) : null;
        const settings = store.getSettings();
        
        preview.innerHTML = `
            <div class="invoice-header">
                <div class="invoice-logo">INVOICE</div>
                <div class="invoice-number">
                    <div><strong>#${this.currentInvoice.id || 'Will be generated'}</strong></div>
                    <div>Date: ${this.formatDate(this.currentInvoice.issueDate)}</div>
                    <div>Due: ${this.formatDate(this.currentInvoice.dueDate)}</div>
                </div>
            </div>
            
            <div class="invoice-parties">
                <div class="bill-to">
                    <h4>Bill To:</h4>
                    ${client ? `
                        <div><strong>${client.name}</strong></div>
                        ${client.company ? `<div>${client.company}</div>` : ''}
                        ${client.email ? `<div>${client.email}</div>` : ''}
                        ${client.phone ? `<div>${client.phone}</div>` : ''}
                        ${client.address ? `<div style="white-space: pre-line;">${client.address}</div>` : ''}
                        ${client.taxId ? `<div>VAT/TIN: ${client.taxId}</div>` : ''}
                    ` : '<div class="text-gray-500">No client selected</div>'}
                </div>
                <div class="invoice-meta">
                    <h4>Invoice Details:</h4>
                    <div>Terms: ${this.currentInvoice.terms}</div>
                    <div>Status: ${this.currentInvoice.getDisplayStatus()}</div>
                    ${this.currentInvoice.recurring.enabled ? `
                        <div>Recurring: ${this.currentInvoice.recurring.interval}</div>
                        ${this.currentInvoice.recurring.nextRun ? `<div>Next: ${this.formatDate(this.currentInvoice.recurring.nextRun)}</div>` : ''}
                    ` : ''}
                </div>
            </div>
            
            ${this.renderItemsTable()}
            
            <div class="invoice-totals">
                ${this.renderTotals()}
            </div>
            
            ${this.currentInvoice.notes ? `
                <div class="invoice-notes">
                    <strong>Notes:</strong><br>
                    ${this.currentInvoice.notes.replace(/\n/g, '<br>')}
                </div>
            ` : ''}
        `;
    }

    /**
     * Render items table for preview
     * @returns {string} Items table HTML
     */
    renderItemsTable() {
        if (this.currentInvoice.items.length === 0) {
            return '<div class="text-gray-500 text-center p-4">No items added</div>';
        }
        
        const rows = this.currentInvoice.items.map(item => {
            const totals = item.calculateTotals();
            return `
                <tr>
                    <td>${item.description || 'Untitled item'}</td>
                    <td class="text-right">${item.qty}</td>
                    <td class="text-right">${this.currencyFormatter.format(item.unitPrice)}</td>
                    <td class="text-right">${item.taxRate}%</td>
                    <td class="text-right">${item.discountRate}%</td>
                    <td class="text-right">${this.currencyFormatter.format(totals.total)}</td>
                </tr>
            `;
        }).join('');
        
        return `
            <table class="invoice-items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th class="text-right">Qty</th>
                        <th class="text-right">Unit Price</th>
                        <th class="text-right">Tax</th>
                        <th class="text-right">Discount</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    /**
     * Render totals section
     * @returns {string} Totals HTML
     */
    renderTotals() {
        const totals = this.currentInvoice.totals;
        
        return `
            <div class="invoice-totals-row">
                <span>Subtotal:</span>
                <span>${this.currencyFormatter.format(totals.subtotal)}</span>
            </div>
            ${totals.discount > 0 ? `
                <div class="invoice-totals-row">
                    <span>Discount:</span>
                    <span>-${this.currencyFormatter.format(totals.discount)}</span>
                </div>
            ` : ''}
            ${totals.tax > 0 ? `
                <div class="invoice-totals-row">
                    <span>Tax:</span>
                    <span>${this.currencyFormatter.format(totals.tax)}</span>
                </div>
            ` : ''}
            ${this.currentInvoice.shipping > 0 ? `
                <div class="invoice-totals-row">
                    <span>Shipping:</span>
                    <span>${this.currencyFormatter.format(this.currentInvoice.shipping)}</span>
                </div>
            ` : ''}
            <div class="invoice-totals-row grand-total">
                <span><strong>Grand Total:</strong></span>
                <span><strong>${this.currencyFormatter.format(totals.grand)}</strong></span>
            </div>
        `;
    }

    /**
     * Format date for display
     * @param {string} dateString - Date string
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Trigger auto-save
     */
    triggerAutoSave() {
        this.autoSave.trigger(this.currentInvoice);
    }

    /**
     * Save invoice
     * @returns {Promise<Object>} Saved invoice
     */
    async saveInvoice() {
        try {
            // Validate invoice
            const validation = this.currentInvoice.validate();
            if (!validation.isValid) {
                toast.error(`Validation failed: ${validation.errors[0]}`);
                throw new Error('Validation failed');
            }
            
            // Save to store
            const savedInvoice = store.saveInvoice(this.currentInvoice);
            
            // Update UI
            document.getElementById('invoice-number').value = savedInvoice.id;
            this.currentInvoice.id = savedInvoice.id;
            this.updatePreview();
            
            return savedInvoice;
        } catch (error) {
            console.error('Save failed:', error);
            throw error;
        }
    }

    /**
     * Handle save invoice button
     */
    async handleSaveInvoice() {
        try {
            const savedInvoice = await this.saveInvoice();
            toast.success('Invoice saved successfully');
            
            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('invoiceSaved', {
                detail: { invoice: savedInvoice }
            }));
        } catch (error) {
            toast.error('Failed to save invoice');
        }
    }

    /**
     * Handle duplicate invoice
     */
    handleDuplicateInvoice() {
        if (!this.currentInvoice.id) {
            toast.error('Please save the invoice first');
            return;
        }
        
        const duplicated = store.duplicateInvoice(this.currentInvoice.id);
        if (duplicated) {
            this.loadInvoice(duplicated.id);
            toast.success('Invoice duplicated');
        } else {
            toast.error('Failed to duplicate invoice');
        }
    }

    /**
     * Handle export to PDF
     */
    async handleExportPDF() {
        if (!this.currentInvoice.id) {
            toast.error('Please save the invoice first');
            return;
        }
        
        try {
            const { exportInvoiceWithFallback } = await import('./export.js');
            const result = await exportInvoiceWithFallback(this.currentInvoice);
            
            if (result.method === 'pdf') {
                toast.success('PDF exported successfully');
            } else if (result.method === 'print') {
                toast.warning(result.message || 'Print dialog opened');
            }
        } catch (error) {
            console.error('Export failed:', error);
            toast.error(error.message || 'Failed to export invoice');
        }
    }

    /**
     * Handle send via email
     */
    async handleSendEmail() {
        // Enhanced validation with better error messages
        if (!this.currentInvoice.id) {
            toast.error('Please save the invoice first before sending');
            return;
        }

        if (!this.currentInvoice.clientId) {
            toast.error('Please select a client for this invoice before sending');
            this.focusClientSelector();
            return;
        }

        const client = store.getClient(this.currentInvoice.clientId);
        if (!client) {
            toast.error('Client not found. Please refresh the page and try again.');
            return;
        }

        if (!client.email) {
            toast.error(`Client "${client.name}" doesn't have an email address.`);
            // Offer to add email quickly
            setTimeout(() => {
                if (confirm('Would you like to add an email address to this client now?')) {
                    this.showQuickEmailAdd(client);
                }
            }, 100);
            return;
        }

        try {
            const { default: emailService } = await import('./email.js');
            await emailService.sendInvoiceViaMailto(this.currentInvoice);
            toast.success(`Email composed for ${client.name} (${client.email})`);
        } catch (error) {
            console.error('Email sending failed:', error);
            toast.error(error.message || 'Failed to compose email');
        }
    }

    /**
     * Focus on client selector
     */
    focusClientSelector() {
        const clientSelect = document.getElementById('client-select');
        if (clientSelect) {
            clientSelect.focus();
            clientSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Show quick email add dialog
     */
    showQuickEmailAdd(client) {
        const email = prompt(`Enter email address for ${client.name}:`);
        if (email && email.trim()) {
            // Validate email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                toast.error('Please enter a valid email address');
                return;
            }
            
            try {
                // Update client with email
                const updatedClient = { ...client, email: email.trim() };
                store.updateClient(client.id, updatedClient);
                
                toast.success(`Email added to ${client.name}!`);
                
                // Update client selector
                this.loadClientOptions();
                
                // Ask if they want to send email now
                setTimeout(() => {
                    if (confirm('Email added! Send invoice now?')) {
                        this.handleSendEmail();
                    }
                }, 500);
                
            } catch (error) {
                console.error('Failed to update client:', error);
                toast.error('Failed to update client email');
            }
        }
    }

    /**
     * Handle send via Gmail
     */
    async handleSendGmail() {
        if (!this.currentInvoice.id) {
            toast.error('Please save the invoice first');
            return;
        }

        const client = store.getClient(this.currentInvoice.clientId);
        if (!client || !client.email) {
            toast.error('Client email address is required. Please add an email to the client.');
            return;
        }

        try {
            const { default: emailService } = await import('./email.js');
            await emailService.sendInvoiceViaGmail(this.currentInvoice);
            toast.success(`Gmail compose opened for ${client.email}`);
        } catch (error) {
            console.error('Gmail sending failed:', error);
            toast.error(error.message || 'Failed to open Gmail');
        }
    }

    /**
     * Handle send with attachment
     */
    async handleSendWithAttachment() {
        if (!this.currentInvoice.id) {
            toast.error('Please save the invoice first');
            return;
        }

        const client = store.getClient(this.currentInvoice.clientId);
        if (!client || !client.email) {
            toast.error('Client email address is required. Please add an email to the client.');
            return;
        }

        try {
            const { default: emailService } = await import('./email.js');
            await emailService.sendInvoiceWithAttachment(this.currentInvoice);
            toast.success('PDF downloaded and email composed');
        } catch (error) {
            console.error('Email with attachment failed:', error);
            toast.error(error.message || 'Failed to send with attachment');
        }
    }

    /**
     * Handle send payment reminder
     */
    async handleSendReminder() {
        if (!this.currentInvoice.id) {
            toast.error('Please save the invoice first');
            return;
        }

        const client = store.getClient(this.currentInvoice.clientId);
        if (!client || !client.email) {
            toast.error('Client email address is required. Please add an email to the client.');
            return;
        }

        try {
            const { default: emailService } = await import('./email.js');
            await emailService.sendPaymentReminder(this.currentInvoice);
            toast.success(`Payment reminder composed for ${client.email}`);
        } catch (error) {
            console.error('Payment reminder failed:', error);
            toast.error(error.message || 'Failed to compose reminder');
        }
    }

    /**
     * Handle email dropdown toggle
     */
    handleEmailDropdownToggle(e) {
        e.preventDefault();
        e.stopPropagation();
        const dropdown = document.getElementById('email-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    /**
     * Handle copy email content
     */
    async handleCopyEmail() {
        if (!this.currentInvoice.id) {
            toast.error('Please save the invoice first before copying email');
            return;
        }

        if (!this.currentInvoice.clientId) {
            toast.error('Please select a client for this invoice first');
            this.focusClientSelector();
            return;
        }

        const client = store.getClient(this.currentInvoice.clientId);
        if (!client) {
            toast.error('Client not found. Please refresh the page and try again.');
            return;
        }

        if (!client.email) {
            toast.error(`Client "${client.name}" doesn't have an email address.`);
            setTimeout(() => {
                if (confirm('Would you like to add an email address to this client now?')) {
                    this.showQuickEmailAdd(client);
                }
            }, 100);
            return;
        }

        try {
            const { default: advancedEmailService } = await import('./advanced-email.js');
            await advancedEmailService.copyEmailToClipboard(this.currentInvoice);
            toast.success(`Email content copied! Paste it into your email client and send to ${client.name} (${client.email})`);
        } catch (error) {
            console.error('Copy email failed:', error);
            toast.error(error.message || 'Failed to copy email content');
        }
    }

    /**
     * Handle social share
     */
    async handleSocialShare() {
        if (!this.currentInvoice.id) {
            toast.error('Please save the invoice first');
            return;
        }

        const client = store.getClient(this.currentInvoice.clientId);
        if (!client || !client.email) {
            toast.error('Client email address is required. Please add an email to the client.');
            return;
        }

        try {
            const { default: advancedEmailService } = await import('./advanced-email.js');
            
            // Try Web Share API first (mobile/modern browsers)
            if (navigator.share) {
                await advancedEmailService.sendViaWebShare(this.currentInvoice);
                toast.success('Share dialog opened');
                return;
            }

            // Fallback: Create social share links
            const shareLinks = advancedEmailService.createSocialShareLinks(this.currentInvoice);
            this.showSocialShareModal(shareLinks, client);
            
        } catch (error) {
            console.error('Social share failed:', error);
            toast.error(error.message || 'Failed to create share options');
        }
    }

    /**
     * Show social share modal
     */
    showSocialShareModal(shareLinks, client) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Share Invoice with ${client.name}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Choose how to share this invoice:</p>
                    <div class="share-buttons">
                        <a href="${shareLinks.whatsapp}" target="_blank" class="btn btn-success">
                            📱 WhatsApp
                        </a>
                        <a href="${shareLinks.telegram}" target="_blank" class="btn btn-primary">
                            ✈️ Telegram
                        </a>
                        <a href="${shareLinks.sms}" class="btn btn-outline">
                            💬 SMS
                        </a>
                        <a href="${shareLinks.email}" class="btn btn-secondary">
                            📧 Email Client
                        </a>
                    </div>
                    <div class="client-info">
                        <p><strong>Client Email:</strong> ${client.email}</p>
                        <button class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText('${client.email}')">
                            Copy Email Address
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        document.body.appendChild(modal);
    }

    /**
     * Handle email setup guide
     */
    handleEmailSetup() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>📧 Email Setup Options</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="email-options">
                        <div class="option">
                            <h4>✅ Current: mailto: (Opens Email Client)</h4>
                            <p>Opens your default email client with pre-composed message. You manually send the email.</p>
                        </div>
                        
                        <div class="option">
                            <h4>🚀 Upgrade Options for Automatic Sending:</h4>
                            
                            <div class="upgrade-option">
                                <h5>1. EmailJS (Recommended)</h5>
                                <p>• Automatically sends emails through your Gmail/Outlook</p>
                                <p>• Free tier: 200 emails/month</p>
                                <p>• Setup: 5 minutes</p>
                                <a href="https://www.emailjs.com/" target="_blank" class="btn btn-primary btn-sm">
                                    Setup EmailJS
                                </a>
                            </div>
                            
                            <div class="upgrade-option">
                                <h5>2. Copy & Paste Method</h5>
                                <p>• Copy email content to clipboard</p>
                                <p>• Paste into any email service</p>
                                <p>• Works everywhere, no setup</p>
                                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('copy-email-btn').click(); this.closest('.modal-overlay').remove();">
                                    Try Copy Method
                                </button>
                            </div>
                            
                            <div class="upgrade-option">
                                <h5>3. Social Sharing</h5>
                                <p>• Share via WhatsApp, Telegram, SMS</p>
                                <p>• Mobile-friendly</p>
                                <p>• No setup required</p>
                                <button class="btn btn-outline btn-sm" onclick="document.getElementById('share-social-btn').click(); this.closest('.modal-overlay').remove();">
                                    Try Social Share
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="help-section">
                        <h4>Need Help?</h4>
                        <p>The EMAIL_SETUP.md file in your project contains detailed setup instructions for each option.</p>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        document.body.appendChild(modal);
    }
}

// Create global instance
const invoiceBuilder = new InvoiceBuilder();

// Make available globally for event handlers
window.invoiceBuilder = invoiceBuilder;

export default invoiceBuilder;
