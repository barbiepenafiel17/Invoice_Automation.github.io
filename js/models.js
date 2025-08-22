// Data Models and Validators

/**
 * Client data model
 */
export class Client {
    constructor(data = {}) {
        this.id = data.id || '';
        this.name = data.name || '';
        this.company = data.company || '';
        this.email = data.email || '';
        this.phone = data.phone || '';
        this.address = data.address || '';
        this.taxId = data.taxId || '';
        this.createdAt = data.createdAt || Date.now();
        this.updatedAt = data.updatedAt || Date.now();
    }

    /**
     * Validate client data
     * @returns {Object} Validation result with isValid and errors
     */
    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length < 2) {
            errors.push('Name is required and must be at least 2 characters');
        }

        if (this.email && !this.isValidEmail(this.email)) {
            errors.push('Invalid email format');
        }

        if (this.phone && !this.isValidPhone(this.phone)) {
            errors.push('Invalid phone format');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate phone format
     * @param {string} phone - Phone to validate
     * @returns {boolean} Is valid phone
     */
    isValidPhone(phone) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        return phone.length >= 10 && phoneRegex.test(phone);
    }

    /**
     * Get formatted display name
     * @returns {string} Formatted name for display
     */
    getDisplayName() {
        if (this.company) {
            return `${this.name} (${this.company})`;
        }
        return this.name;
    }

    /**
     * Get formatted address for display
     * @returns {string} Formatted address
     */
    getFormattedAddress() {
        return this.address.replace(/\n/g, '<br>');
    }
}

/**
 * Invoice line item model
 */
export class LineItem {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.description = data.description || '';
        this.qty = parseFloat(data.qty) || 1;
        this.unitPrice = parseFloat(data.unitPrice) || 0;
        this.taxRate = parseFloat(data.taxRate) || 0;
        this.discountRate = parseFloat(data.discountRate) || 0;
    }

    /**
     * Generate unique line item ID
     * @returns {string} Generated ID
     */
    generateId() {
        return 'li_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Calculate line item totals
     * @returns {Object} Calculated totals
     */
    calculateTotals() {
        const subtotal = this.qty * this.unitPrice;
        const discount = subtotal * (this.discountRate / 100);
        const taxableBase = subtotal - discount;
        const tax = taxableBase * (this.taxRate / 100);
        const total = taxableBase + tax;

        return {
            subtotal: this.roundToTwo(subtotal),
            discount: this.roundToTwo(discount),
            taxableBase: this.roundToTwo(taxableBase),
            tax: this.roundToTwo(tax),
            total: this.roundToTwo(total)
        };
    }

    /**
     * Validate line item data
     * @returns {Object} Validation result
     */
    validate() {
        const errors = [];

        if (!this.description || this.description.trim().length < 1) {
            errors.push('Description is required');
        }

        if (this.qty <= 0) {
            errors.push('Quantity must be greater than 0');
        }

        if (this.unitPrice < 0) {
            errors.push('Unit price cannot be negative');
        }

        if (this.taxRate < 0 || this.taxRate > 100) {
            errors.push('Tax rate must be between 0 and 100');
        }

        if (this.discountRate < 0 || this.discountRate > 100) {
            errors.push('Discount rate must be between 0 and 100');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Round number to 2 decimal places
     * @param {number} num - Number to round
     * @returns {number} Rounded number
     */
    roundToTwo(num) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }
}

/**
 * Invoice model
 */
export class Invoice {
    constructor(data = {}) {
        this.id = data.id || '';
        this.clientId = data.clientId || '';
        this.issueDate = data.issueDate || new Date().toISOString().split('T')[0];
        this.dueDate = data.dueDate || this.calculateDefaultDueDate();
        this.terms = data.terms || 'Net 30';
        this.items = (data.items || []).map(item => new LineItem(item));
        this.shipping = parseFloat(data.shipping) || 0;
        this.notes = data.notes || '';
        this.status = data.status || 'unpaid';
        this.recurring = {
            enabled: false,
            interval: 'monthly',
            nextRun: null,
            ...data.recurring
        };
        this.totals = data.totals || this.calculateTotals();
        this.createdAt = data.createdAt || Date.now();
        this.updatedAt = data.updatedAt || Date.now();
    }

    /**
     * Calculate default due date (30 days from today)
     * @returns {string} Due date in YYYY-MM-DD format
     */
    calculateDefaultDueDate() {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
    }

    /**
     * Calculate due date based on payment terms
     * @param {string} issueDate - Issue date in YYYY-MM-DD format
     * @returns {string} Due date in YYYY-MM-DD format
     */
    calculateDueDateFromTerms(issueDate = this.issueDate) {
        const date = new Date(issueDate);
        const daysMatch = this.terms.match(/Net (\d+)/);
        const days = daysMatch ? parseInt(daysMatch[1]) : 30;
        
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    /**
     * Add line item
     * @param {Object} itemData - Line item data
     * @returns {LineItem} Added line item
     */
    addItem(itemData = {}) {
        const item = new LineItem(itemData);
        this.items.push(item);
        this.updateTotals();
        return item;
    }

    /**
     * Remove line item
     * @param {string} itemId - Line item ID to remove
     * @returns {boolean} Success status
     */
    removeItem(itemId) {
        const initialLength = this.items.length;
        this.items = this.items.filter(item => item.id !== itemId);
        const removed = this.items.length < initialLength;
        
        if (removed) {
            this.updateTotals();
        }
        
        return removed;
    }

    /**
     * Update line item
     * @param {string} itemId - Line item ID
     * @param {Object} updates - Updated data
     * @returns {LineItem|null} Updated line item or null if not found
     */
    updateItem(itemId, updates) {
        const item = this.items.find(item => item.id === itemId);
        if (!item) return null;
        
        Object.assign(item, updates);
        this.updateTotals();
        return item;
    }

    /**
     * Calculate invoice totals
     * @returns {Object} Calculated totals
     */
    calculateTotals() {
        const itemTotals = this.items.map(item => item.calculateTotals());
        
        const subtotal = itemTotals.reduce((sum, totals) => sum + totals.subtotal, 0);
        const discount = itemTotals.reduce((sum, totals) => sum + totals.discount, 0);
        const tax = itemTotals.reduce((sum, totals) => sum + totals.tax, 0);
        const grand = subtotal - discount + tax + this.shipping;

        return {
            subtotal: this.roundToTwo(subtotal),
            discount: this.roundToTwo(discount),
            tax: this.roundToTwo(tax),
            shipping: this.roundToTwo(this.shipping),
            grand: this.roundToTwo(grand)
        };
    }

    /**
     * Update totals and save
     */
    updateTotals() {
        this.totals = this.calculateTotals();
        this.updatedAt = Date.now();
    }

    /**
     * Validate invoice data
     * @returns {Object} Validation result
     */
    validate() {
        const errors = [];

        if (!this.clientId) {
            errors.push('Client is required');
        }

        if (!this.issueDate) {
            errors.push('Issue date is required');
        }

        if (!this.dueDate) {
            errors.push('Due date is required');
        }

        if (new Date(this.dueDate) <= new Date(this.issueDate)) {
            errors.push('Due date must be after issue date');
        }

        if (this.items.length === 0) {
            errors.push('At least one line item is required');
        }

        // Validate all line items
        const itemErrors = [];
        this.items.forEach((item, index) => {
            const itemValidation = item.validate();
            if (!itemValidation.isValid) {
                itemErrors.push(`Item ${index + 1}: ${itemValidation.errors.join(', ')}`);
            }
        });

        if (this.shipping < 0) {
            errors.push('Shipping cost cannot be negative');
        }

        return {
            isValid: errors.length === 0 && itemErrors.length === 0,
            errors: [...errors, ...itemErrors]
        };
    }

    /**
     * Check if invoice is overdue
     * @returns {boolean} Is overdue
     */
    isOverdue() {
        if (this.status === 'paid') return false;
        return new Date(this.dueDate) < new Date();
    }

    /**
     * Check if invoice is due soon (within 5 days)
     * @returns {boolean} Is due soon
     */
    isDueSoon() {
        if (this.status === 'paid') return false;
        const dueDate = new Date(this.dueDate);
        const now = new Date();
        const fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(now.getDate() + 5);
        
        return dueDate >= now && dueDate <= fiveDaysFromNow;
    }

    /**
     * Get status badge class
     * @returns {string} CSS class for status badge
     */
    getStatusBadgeClass() {
        if (this.status === 'paid') return 'badge-paid';
        if (this.isOverdue()) return 'badge-overdue';
        if (this.isDueSoon()) return 'badge-due-soon';
        return 'badge-unpaid';
    }

    /**
     * Get display status text
     * @returns {string} Display status
     */
    getDisplayStatus() {
        if (this.status === 'paid') return 'PAID';
        if (this.isOverdue()) return 'OVERDUE';
        if (this.isDueSoon()) return 'DUE SOON';
        return 'UNPAID';
    }

    /**
     * Round number to 2 decimal places
     * @param {number} num - Number to round
     * @returns {number} Rounded number
     */
    roundToTwo(num) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    /**
     * Get formatted currency string
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency code
     * @returns {string} Formatted currency
     */
    formatCurrency(amount, currency = 'PHP') {
        const symbols = {
            'PHP': '₱',
            'USD': '$',
            'EUR': '€'
        };

        const symbol = symbols[currency] || currency;
        return `${symbol}${amount.toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        })}`;
    }
}

/**
 * Application settings model
 */
export class Settings {
    constructor(data = {}) {
        this.invoicePrefix = data.invoicePrefix || 'INV';
        this.currency = data.currency || 'PHP';
        this.numberSeed = parseInt(data.numberSeed) || 1;
    }

    /**
     * Validate settings
     * @returns {Object} Validation result
     */
    validate() {
        const errors = [];

        if (!this.invoicePrefix || this.invoicePrefix.trim().length === 0) {
            errors.push('Invoice prefix is required');
        }

        if (this.invoicePrefix.length > 10) {
            errors.push('Invoice prefix must be 10 characters or less');
        }

        if (this.numberSeed < 1) {
            errors.push('Number seed must be at least 1');
        }

        const validCurrencies = ['PHP', 'USD', 'EUR'];
        if (!validCurrencies.includes(this.currency)) {
            errors.push('Invalid currency selection');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get currency symbol
     * @returns {string} Currency symbol
     */
    getCurrencySymbol() {
        const symbols = {
            'PHP': '₱',
            'USD': '$',
            'EUR': '€'
        };
        return symbols[this.currency] || this.currency;
    }
}

/**
 * Form validation utilities
 */
export class FormValidator {
    /**
     * Validate required field
     * @param {any} value - Value to validate
     * @param {string} fieldName - Field name for error message
     * @returns {string|null} Error message or null if valid
     */
    static required(value, fieldName) {
        if (!value || (typeof value === 'string' && value.trim().length === 0)) {
            return `${fieldName} is required`;
        }
        return null;
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {string|null} Error message or null if valid
     */
    static email(email) {
        if (!email) return null;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) ? null : 'Invalid email format';
    }

    /**
     * Validate phone format
     * @param {string} phone - Phone to validate
     * @returns {string|null} Error message or null if valid
     */
    static phone(phone) {
        if (!phone) return null;
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        return phone.length >= 10 && phoneRegex.test(phone) ? null : 'Invalid phone format';
    }

    /**
     * Validate number range
     * @param {number} value - Value to validate
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {string} fieldName - Field name for error message
     * @returns {string|null} Error message or null if valid
     */
    static numberRange(value, min, max, fieldName) {
        const num = parseFloat(value);
        if (isNaN(num)) {
            return `${fieldName} must be a number`;
        }
        if (num < min || num > max) {
            return `${fieldName} must be between ${min} and ${max}`;
        }
        return null;
    }

    /**
     * Validate date
     * @param {string} date - Date string to validate
     * @param {string} fieldName - Field name for error message
     * @returns {string|null} Error message or null if valid
     */
    static date(date, fieldName) {
        if (!date) return `${fieldName} is required`;
        const dateObj = new Date(date);
        return isNaN(dateObj.getTime()) ? `${fieldName} must be a valid date` : null;
    }

    /**
     * Validate date range
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @param {string} startFieldName - Start field name
     * @param {string} endFieldName - End field name
     * @returns {string|null} Error message or null if valid
     */
    static dateRange(startDate, endDate, startFieldName, endFieldName) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime())) return `${startFieldName} must be a valid date`;
        if (isNaN(end.getTime())) return `${endFieldName} must be a valid date`;
        
        return end <= start ? `${endFieldName} must be after ${startFieldName}` : null;
    }
}
