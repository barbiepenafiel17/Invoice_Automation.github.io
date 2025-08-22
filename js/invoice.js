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
            option.textContent = client.company ? `${client.name} (${client.company})` : client.name;
            clientSelect.appendChild(option);
        });
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
            const { exportToPDF } = await import('./export.js');
            await exportToPDF(this.currentInvoice);
            toast.success('PDF exported successfully');
        } catch (error) {
            console.error('PDF export failed:', error);
            toast.error('Failed to export PDF');
        }
    }
}

// Create global instance
const invoiceBuilder = new InvoiceBuilder();

// Make available globally for event handlers
window.invoiceBuilder = invoiceBuilder;

export default invoiceBuilder;
