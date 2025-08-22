// UI Helper Functions and Components

/**
 * Toast notification system
 */
export class Toast {
    constructor() {
        this.container = document.getElementById('toast-container');
        this.toasts = new Map();
    }

    /**
     * Show success toast
     * @param {string} message - Success message
     * @param {number} duration - Display duration in ms
     */
    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }

    /**
     * Show error toast
     * @param {string} message - Error message
     * @param {number} duration - Display duration in ms
     */
    error(message, duration = 5000) {
        this.show(message, 'error', duration);
    }

    /**
     * Show info toast
     * @param {string} message - Info message
     * @param {number} duration - Display duration in ms
     */
    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, info)
     * @param {number} duration - Display duration in ms
     */
    show(message, type = 'info', duration = 3000) {
        const toastId = Date.now().toString();
        const toast = this.createToast(message, type, toastId);
        
        this.container.appendChild(toast);
        this.toasts.set(toastId, toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto remove
        setTimeout(() => {
            this.remove(toastId);
        }, duration);

        // Click to remove
        toast.addEventListener('click', () => {
            this.remove(toastId);
        });
    }

    /**
     * Create toast element
     * @param {string} message - Toast message
     * @param {string} type - Toast type
     * @param {string} id - Toast ID
     * @returns {HTMLElement} Toast element
     */
    createToast(message, type, id) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.dataset.toastId = id;
        toast.innerHTML = `
            <div class="toast-content">
                ${this.getTypeIcon(type)}
                <span class="toast-message">${message}</span>
            </div>
        `;
        toast.style.cursor = 'pointer';
        return toast;
    }

    /**
     * Get icon for toast type
     * @param {string} type - Toast type
     * @returns {string} Icon HTML
     */
    getTypeIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ'
        };
        return `<span class="toast-icon">${icons[type] || icons.info}</span>`;
    }

    /**
     * Remove toast
     * @param {string} toastId - Toast ID to remove
     */
    remove(toastId) {
        const toast = this.toasts.get(toastId);
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                this.toasts.delete(toastId);
            }, 200);
        }
    }
}

/**
 * Modal dialog system
 */
export class Modal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        this.isOpen = false;
        this.onClose = null;
        this.onOpen = null;
        
        this.init();
    }

    /**
     * Initialize modal event listeners
     */
    init() {
        if (!this.modal) return;

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Close on close button click
        const closeBtn = this.modal.querySelector('.modal-close, .modal-cancel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    /**
     * Open modal
     * @param {Function} onOpen - Callback when modal opens
     */
    open(onOpen = null) {
        this.modal.classList.add('show');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        
        // Focus first input
        const firstInput = this.modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }

        if (onOpen) onOpen();
        if (this.onOpen) this.onOpen();
    }

    /**
     * Close modal
     * @param {Function} onClose - Callback when modal closes
     */
    close(onClose = null) {
        this.modal.classList.remove('show');
        this.isOpen = false;
        document.body.style.overflow = '';

        if (onClose) onClose();
        if (this.onClose) this.onClose();
    }

    /**
     * Set modal title
     * @param {string} title - Modal title
     */
    setTitle(title) {
        const titleElement = this.modal.querySelector('#client-modal-title, .modal-title, h3');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Reset form in modal
     */
    resetForm() {
        const form = this.modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

/**
 * Auto-save manager
 */
export class AutoSave {
    constructor(saveCallback, delay = 3000) {
        this.saveCallback = saveCallback;
        this.delay = delay;
        this.timeoutId = null;
        this.indicator = document.getElementById('auto-save-status');
    }

    /**
     * Trigger auto-save after delay
     * @param {Object} data - Data to save
     */
    trigger(data) {
        clearTimeout(this.timeoutId);
        this.setStatus('typing');
        
        this.timeoutId = setTimeout(async () => {
            this.setStatus('saving');
            try {
                await this.saveCallback(data);
                this.setStatus('saved');
            } catch (error) {
                console.error('Auto-save failed:', error);
                this.setStatus('error');
            }
        }, this.delay);
    }

    /**
     * Cancel pending auto-save
     */
    cancel() {
        clearTimeout(this.timeoutId);
        this.setStatus('');
    }

    /**
     * Set auto-save status indicator
     * @param {string} status - Status (typing, saving, saved, error)
     */
    setStatus(status) {
        if (!this.indicator) return;
        
        const messages = {
            typing: 'Typing...',
            saving: 'Saving...',
            saved: 'Draft saved',
            error: 'Save failed'
        };

        const classes = {
            typing: '',
            saving: 'saving',
            saved: 'saved',
            error: 'error'
        };

        this.indicator.className = `auto-save-indicator ${classes[status] || ''}`;
        this.indicator.querySelector('.status-text').textContent = messages[status] || '';
    }
}

/**
 * Table sorting utility
 */
export class TableSorter {
    constructor(tableId) {
        this.table = document.getElementById(tableId);
        this.tbody = this.table?.querySelector('tbody');
        this.headers = this.table?.querySelectorAll('th[data-sort]');
        this.currentSort = { column: null, direction: 'asc' };
        
        this.init();
    }

    /**
     * Initialize sorting event listeners
     */
    init() {
        if (!this.table) return;

        this.headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                this.sort(column);
            });
        });
    }

    /**
     * Sort table by column
     * @param {string} column - Column to sort by
     */
    sort(column) {
        const direction = this.currentSort.column === column && this.currentSort.direction === 'asc' 
            ? 'desc' : 'asc';

        const rows = Array.from(this.tbody.children);
        
        rows.sort((a, b) => {
            const aVal = this.getCellValue(a, column);
            const bVal = this.getCellValue(b, column);
            
            if (direction === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });

        // Clear existing sort indicators
        this.headers.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });

        // Add sort indicator to current column
        const currentHeader = this.table.querySelector(`th[data-sort="${column}"]`);
        currentHeader.classList.add(`sort-${direction}`);

        // Reorder rows
        rows.forEach(row => this.tbody.appendChild(row));

        this.currentSort = { column, direction };
    }

    /**
     * Get cell value for sorting
     * @param {HTMLElement} row - Table row
     * @param {string} column - Column name
     * @returns {string|number} Cell value
     */
    getCellValue(row, column) {
        const cell = row.querySelector(`[data-${column}]`);
        if (!cell) return '';
        
        const value = cell.dataset[column] || cell.textContent.trim();
        
        // Try to parse as number or date
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) return numValue;
        
        const dateValue = Date.parse(value);
        if (!isNaN(dateValue)) return dateValue;
        
        return value.toLowerCase();
    }
}

/**
 * Search functionality
 */
export class Search {
    constructor(inputId, targetSelector, searchCallback) {
        this.input = document.getElementById(inputId);
        this.targetSelector = targetSelector;
        this.searchCallback = searchCallback;
        this.debounceDelay = 300;
        this.timeoutId = null;
        
        this.init();
    }

    /**
     * Initialize search event listeners
     */
    init() {
        if (!this.input) return;

        this.input.addEventListener('input', (e) => {
            clearTimeout(this.timeoutId);
            this.timeoutId = setTimeout(() => {
                this.search(e.target.value);
            }, this.debounceDelay);
        });

        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clear();
            }
        });
    }

    /**
     * Perform search
     * @param {string} query - Search query
     */
    search(query) {
        if (this.searchCallback) {
            this.searchCallback(query);
        } else {
            this.defaultSearch(query);
        }
    }

    /**
     * Default search implementation
     * @param {string} query - Search query
     */
    defaultSearch(query) {
        const targets = document.querySelectorAll(this.targetSelector);
        const searchTerm = query.toLowerCase().trim();
        
        targets.forEach(target => {
            const text = target.textContent.toLowerCase();
            const matches = !searchTerm || text.includes(searchTerm);
            target.style.display = matches ? '' : 'none';
        });
    }

    /**
     * Clear search
     */
    clear() {
        this.input.value = '';
        this.search('');
    }
}

/**
 * Form utilities
 */
export class FormUtils {
    /**
     * Serialize form data
     * @param {HTMLFormElement} form - Form to serialize
     * @returns {Object} Form data object
     */
    static serialize(form) {
        const data = {};
        const formData = new FormData(form);
        
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    /**
     * Populate form with data
     * @param {HTMLFormElement} form - Form to populate
     * @param {Object} data - Data to populate with
     */
    static populate(form, data) {
        Object.keys(data).forEach(key => {
            const element = form.querySelector(`[name="${key}"], #${key}`);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = Boolean(data[key]);
                } else {
                    element.value = data[key] || '';
                }
            }
        });
    }

    /**
     * Validate form and show errors
     * @param {HTMLFormElement} form - Form to validate
     * @param {Object} validators - Validation rules
     * @returns {boolean} Is valid
     */
    static validate(form, validators) {
        let isValid = true;
        const data = this.serialize(form);
        
        // Clear existing errors
        form.querySelectorAll('.form-error').forEach(error => error.remove());
        form.querySelectorAll('.error').forEach(element => element.classList.remove('error'));
        
        Object.keys(validators).forEach(fieldName => {
            const validator = validators[fieldName];
            const value = data[fieldName];
            const error = validator(value);
            
            if (error) {
                isValid = false;
                this.showFieldError(form, fieldName, error);
            }
        });
        
        return isValid;
    }

    /**
     * Show field error
     * @param {HTMLFormElement} form - Form element
     * @param {string} fieldName - Field name
     * @param {string} error - Error message
     */
    static showFieldError(form, fieldName, error) {
        const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
        if (!field) return;
        
        field.classList.add('error');
        
        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.textContent = error;
        
        const formGroup = field.closest('.form-group');
        if (formGroup) {
            formGroup.appendChild(errorElement);
        } else {
            field.parentNode.insertBefore(errorElement, field.nextSibling);
        }
    }

    /**
     * Clear form errors
     * @param {HTMLFormElement} form - Form to clear errors from
     */
    static clearErrors(form) {
        form.querySelectorAll('.form-error').forEach(error => error.remove());
        form.querySelectorAll('.error').forEach(element => element.classList.remove('error'));
    }
}

/**
 * Currency formatter
 */
export class CurrencyFormatter {
    constructor(currency = 'PHP') {
        this.currency = currency;
        this.symbols = {
            'PHP': '₱',
            'USD': '$',
            'EUR': '€'
        };
    }

    /**
     * Format amount as currency
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    format(amount) {
        if (isNaN(amount)) return this.format(0);
        
        const symbol = this.symbols[this.currency] || this.currency;
        return `${symbol}${amount.toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        })}`;
    }

    /**
     * Parse currency string to number
     * @param {string} currencyString - Currency string to parse
     * @returns {number} Parsed amount
     */
    parse(currencyString) {
        if (typeof currencyString !== 'string') return 0;
        
        const cleaned = currencyString.replace(/[^\d.-]/g, '');
        return parseFloat(cleaned) || 0;
    }

    /**
     * Set currency
     * @param {string} currency - New currency code
     */
    setCurrency(currency) {
        this.currency = currency;
    }
}

/**
 * Date utilities
 */
export class DateUtils {
    /**
     * Format date for display
     * @param {string|Date} date - Date to format
     * @returns {string} Formatted date
     */
    static formatDate(date) {
        if (!date) return '';
        
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '';
        
        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Format date for input field
     * @param {string|Date} date - Date to format
     * @returns {string} Formatted date (YYYY-MM-DD)
     */
    static formatForInput(date) {
        if (!date) return '';
        
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '';
        
        return dateObj.toISOString().split('T')[0];
    }

    /**
     * Add days to date
     * @param {string|Date} date - Base date
     * @param {number} days - Days to add
     * @returns {Date} New date
     */
    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    /**
     * Get days between dates
     * @param {string|Date} startDate - Start date
     * @param {string|Date} endDate - End date
     * @returns {number} Days difference
     */
    static daysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Check if date is today
     * @param {string|Date} date - Date to check
     * @returns {boolean} Is today
     */
    static isToday(date) {
        const today = new Date();
        const checkDate = new Date(date);
        
        return today.toDateString() === checkDate.toDateString();
    }

    /**
     * Check if date is in the past
     * @param {string|Date} date - Date to check
     * @returns {boolean} Is in past
     */
    static isPast(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        
        return checkDate < today;
    }
}

/**
 * Loading state manager
 */
export class LoadingManager {
    constructor() {
        this.loadingElements = new Set();
    }

    /**
     * Show loading state on element
     * @param {HTMLElement} element - Element to show loading on
     * @param {string} text - Loading text
     */
    show(element, text = 'Loading...') {
        element.classList.add('loading');
        element.disabled = true;
        
        const originalText = element.textContent;
        element.dataset.originalText = originalText;
        element.innerHTML = `<span class="spinner"></span> ${text}`;
        
        this.loadingElements.add(element);
    }

    /**
     * Hide loading state from element
     * @param {HTMLElement} element - Element to hide loading from
     */
    hide(element) {
        element.classList.remove('loading');
        element.disabled = false;
        
        const originalText = element.dataset.originalText;
        if (originalText) {
            element.textContent = originalText;
            delete element.dataset.originalText;
        }
        
        this.loadingElements.delete(element);
    }

    /**
     * Hide all loading states
     */
    hideAll() {
        this.loadingElements.forEach(element => this.hide(element));
    }
}

// Export instances for global use
export const toast = new Toast();
export const loadingManager = new LoadingManager();
