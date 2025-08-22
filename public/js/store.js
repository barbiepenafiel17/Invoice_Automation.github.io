// Store Management - localStorage CRUD operations
class Store {
    constructor() {
        this.storageKey = 'invoiceApp:v1';
        this.defaultData = {
            clients: [],
            invoices: [],
            settings: {
                invoicePrefix: 'INV',
                currency: 'PHP',
                numberSeed: 1
            }
        };
        this.initializeStorage();
    }

    /**
     * Initialize localStorage with default data if not exists
     */
    initializeStorage() {
        const stored = localStorage.getItem(this.storageKey);
        if (!stored) {
            this.setState(this.defaultData);
        }
    }

    /**
     * Get complete application state
     * @returns {Object} Complete application data
     */
    getState() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : this.defaultData;
        } catch (error) {
            console.error('Error parsing stored data:', error);
            return this.defaultData;
        }
    }

    /**
     * Set complete application state
     * @param {Object} data - Complete application data
     */
    setState(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            // Dispatch custom event for state changes
            window.dispatchEvent(new CustomEvent('stateChange', { detail: data }));
        } catch (error) {
            console.error('Error saving data:', error);
            throw new Error('Failed to save data to localStorage');
        }
    }

    /**
     * Get all clients
     * @returns {Array} Array of client objects
     */
    getClients() {
        const state = this.getState();
        return state.clients || [];
    }

    /**
     * Add a new client
     * @param {Object} clientData - Client information
     * @returns {Object} Added client with generated ID
     */
    addClient(clientData) {
        const state = this.getState();
        const client = {
            id: this.generateClientId(),
            ...clientData,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        state.clients.push(client);
        this.setState(state);
        return client;
    }

    /**
     * Update existing client
     * @param {string} clientId - Client ID to update
     * @param {Object} updates - Updated client data
     * @returns {Object|null} Updated client or null if not found
     */
    updateClient(clientId, updates) {
        const state = this.getState();
        const clientIndex = state.clients.findIndex(c => c.id === clientId);
        
        if (clientIndex === -1) return null;
        
        state.clients[clientIndex] = {
            ...state.clients[clientIndex],
            ...updates,
            updatedAt: Date.now()
        };
        
        this.setState(state);
        return state.clients[clientIndex];
    }

    /**
     * Delete a client
     * @param {string} clientId - Client ID to delete
     * @returns {boolean} Success status
     */
    deleteClient(clientId) {
        const state = this.getState();
        const initialLength = state.clients.length;
        state.clients = state.clients.filter(c => c.id !== clientId);
        
        if (state.clients.length < initialLength) {
            this.setState(state);
            return true;
        }
        return false;
    }

    /**
     * Get client by ID
     * @param {string} clientId - Client ID
     * @returns {Object|null} Client object or null if not found
     */
    getClient(clientId) {
        const clients = this.getClients();
        return clients.find(c => c.id === clientId) || null;
    }

    /**
     * Get all invoices
     * @returns {Array} Array of invoice objects
     */
    getInvoices() {
        const state = this.getState();
        return state.invoices || [];
    }

    /**
     * Save an invoice (create or update)
     * @param {Object} invoiceData - Invoice data
     * @returns {Object} Saved invoice
     */
    saveInvoice(invoiceData) {
        const state = this.getState();
        const now = Date.now();
        
        if (invoiceData.id) {
            // Update existing invoice
            const invoiceIndex = state.invoices.findIndex(i => i.id === invoiceData.id);
            if (invoiceIndex !== -1) {
                state.invoices[invoiceIndex] = {
                    ...invoiceData,
                    updatedAt: now
                };
            }
        } else {
            // Create new invoice
            const invoice = {
                ...invoiceData,
                id: this.generateInvoiceNumber(),
                createdAt: now,
                updatedAt: now
            };
            state.invoices.push(invoice);
            
            // Increment number seed
            state.settings.numberSeed += 1;
        }
        
        this.setState(state);
        return invoiceData.id ? 
            state.invoices.find(i => i.id === invoiceData.id) : 
            state.invoices[state.invoices.length - 1];
    }

    /**
     * Get invoice by ID
     * @param {string} invoiceId - Invoice ID
     * @returns {Object|null} Invoice object or null if not found
     */
    getInvoice(invoiceId) {
        const invoices = this.getInvoices();
        return invoices.find(i => i.id === invoiceId) || null;
    }

    /**
     * Delete an invoice
     * @param {string} invoiceId - Invoice ID to delete
     * @returns {boolean} Success status
     */
    deleteInvoice(invoiceId) {
        const state = this.getState();
        const initialLength = state.invoices.length;
        state.invoices = state.invoices.filter(i => i.id !== invoiceId);
        
        if (state.invoices.length < initialLength) {
            this.setState(state);
            return true;
        }
        return false;
    }

    /**
     * Mark invoice as paid
     * @param {string} invoiceId - Invoice ID
     * @returns {Object|null} Updated invoice or null if not found
     */
    markPaid(invoiceId) {
        const invoice = this.getInvoice(invoiceId);
        if (!invoice) return null;
        
        return this.updateInvoiceStatus(invoiceId, 'paid');
    }

    /**
     * Update invoice status
     * @param {string} invoiceId - Invoice ID
     * @param {string} status - New status (unpaid, paid, overdue)
     * @returns {Object|null} Updated invoice or null if not found
     */
    updateInvoiceStatus(invoiceId, status) {
        const state = this.getState();
        const invoiceIndex = state.invoices.findIndex(i => i.id === invoiceId);
        
        if (invoiceIndex === -1) return null;
        
        state.invoices[invoiceIndex].status = status;
        state.invoices[invoiceIndex].updatedAt = Date.now();
        
        this.setState(state);
        return state.invoices[invoiceIndex];
    }

    /**
     * Duplicate an invoice
     * @param {string} invoiceId - Invoice ID to duplicate
     * @returns {Object|null} New invoice or null if original not found
     */
    duplicateInvoice(invoiceId) {
        const invoice = this.getInvoice(invoiceId);
        if (!invoice) return null;
        
        const duplicatedInvoice = {
            ...invoice,
            id: undefined, // Will be generated by saveInvoice
            status: 'unpaid',
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: this.calculateDueDate(invoice.terms),
            createdAt: undefined, // Will be set by saveInvoice
            updatedAt: undefined // Will be set by saveInvoice
        };
        
        return this.saveInvoice(duplicatedInvoice);
    }

    /**
     * Get application settings
     * @returns {Object} Settings object
     */
    getSettings() {
        const state = this.getState();
        return state.settings || this.defaultData.settings;
    }

    /**
     * Update application settings
     * @param {Object} settingsUpdate - Updated settings
     * @returns {Object} Updated settings
     */
    updateSettings(settingsUpdate) {
        const state = this.getState();
        state.settings = {
            ...state.settings,
            ...settingsUpdate
        };
        
        this.setState(state);
        return state.settings;
    }

    /**
     * Export all data as JSON
     * @returns {string} JSON string of all data
     */
    exportJSON() {
        return JSON.stringify(this.getState(), null, 2);
    }

    /**
     * Import data from JSON
     * @param {string} jsonData - JSON string to import
     * @returns {boolean} Success status
     */
    importJSON(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Validate data structure
            if (!this.validateImportData(data)) {
                throw new Error('Invalid data structure');
            }
            
            // Merge with default data to ensure all required properties exist
            const mergedData = {
                ...this.defaultData,
                ...data,
                settings: {
                    ...this.defaultData.settings,
                    ...data.settings
                }
            };
            
            this.setState(mergedData);
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }

    /**
     * Validate imported data structure
     * @param {Object} data - Data to validate
     * @returns {boolean} Is valid
     */
    validateImportData(data) {
        return (
            data &&
            typeof data === 'object' &&
            Array.isArray(data.clients) &&
            Array.isArray(data.invoices) &&
            data.settings &&
            typeof data.settings === 'object'
        );
    }

    /**
     * Generate unique client ID
     * @returns {string} Client ID
     */
    generateClientId() {
        return 'c_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Generate invoice number based on settings
     * @returns {string} Invoice number
     */
    generateInvoiceNumber() {
        const settings = this.getSettings();
        const date = new Date();
        const yearMonth = date.getFullYear().toString() + String(date.getMonth() + 1).padStart(2, '0');
        const counter = String(settings.numberSeed).padStart(3, '0');
        
        return `${settings.invoicePrefix}-${yearMonth}-${counter}`;
    }

    /**
     * Calculate due date based on payment terms
     * @param {string} terms - Payment terms (e.g., "Net 30")
     * @returns {string} Due date in YYYY-MM-DD format
     */
    calculateDueDate(terms) {
        const issueDate = new Date();
        const daysMatch = terms.match(/Net (\d+)/);
        const days = daysMatch ? parseInt(daysMatch[1]) : 30;
        
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + days);
        
        return dueDate.toISOString().split('T')[0];
    }

    /**
     * Get invoice statistics
     * @returns {Object} Invoice statistics
     */
    getInvoiceStats() {
        const invoices = this.getInvoices();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const stats = {
            total: invoices.length,
            unpaid: 0,
            overdue: 0,
            collectedThisMonth: 0
        };

        invoices.forEach(invoice => {
            // Update overdue status
            const dueDate = new Date(invoice.dueDate);
            if (invoice.status === 'unpaid' && dueDate < now) {
                this.updateInvoiceStatus(invoice.id, 'overdue');
                invoice.status = 'overdue'; // Update local copy for stats
            }
            
            // Count unpaid and overdue
            if (invoice.status === 'unpaid') {
                stats.unpaid++;
            } else if (invoice.status === 'overdue') {
                stats.overdue++;
            }
            
            // Calculate collected this month
            if (invoice.status === 'paid') {
                const updatedDate = new Date(invoice.updatedAt);
                if (updatedDate.getMonth() === currentMonth && updatedDate.getFullYear() === currentYear) {
                    stats.collectedThisMonth += invoice.totals.grand || 0;
                }
            }
        });

        return stats;
    }

    /**
     * Search invoices
     * @param {string} query - Search query
     * @returns {Array} Filtered invoices
     */
    searchInvoices(query) {
        const invoices = this.getInvoices();
        const clients = this.getClients();
        
        if (!query.trim()) return invoices;
        
        const searchTerm = query.toLowerCase();
        
        return invoices.filter(invoice => {
            const client = clients.find(c => c.id === invoice.clientId);
            const clientName = client ? `${client.name} ${client.company}`.toLowerCase() : '';
            
            return (
                invoice.id.toLowerCase().includes(searchTerm) ||
                clientName.includes(searchTerm) ||
                invoice.notes.toLowerCase().includes(searchTerm)
            );
        });
    }

    /**
     * Search clients
     * @param {string} query - Search query
     * @returns {Array} Filtered clients
     */
    searchClients(query) {
        const clients = this.getClients();
        
        if (!query.trim()) return clients;
        
        const searchTerm = query.toLowerCase();
        
        return clients.filter(client => 
            client.name.toLowerCase().includes(searchTerm) ||
            (client.company && client.company.toLowerCase().includes(searchTerm)) ||
            (client.email && client.email.toLowerCase().includes(searchTerm))
        );
    }
}

// Export store instance
export default new Store();
