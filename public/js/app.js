// Main Application Bootstrap and Router
import store from './store.js';
import { toast, Modal } from './ui.js';
import invoiceBuilder from './invoice.js';
import dashboard from './dashboard.js';
import databaseService from './database.js';
import { Client, Settings, FormValidator } from './models.js';

class App {
    constructor() {
        this.currentView = 'dashboard';
        this.clientModal = null;
        this.currentEditingClient = null;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize application
     */
    init() {
        if (this.isInitialized) return;
        
        this.initializeUI();
        this.bindEvents();
        this.initializeRouter();
        this.initializeComponents();
        
        this.isInitialized = true;
    }

    /**
     * Initialize UI components
     */
    initializeUI() {
        // Initialize client modal
        this.clientModal = new Modal('client-modal');
        
        // Set initial view
        this.switchView(this.getViewFromURL());
        
        // Load settings into UI
        this.loadSettings();
    }

    /**
     * Bind global event listeners
     */
    bindEvents() {
        // Excel Export
        document.getElementById('export-excel-btn')?.addEventListener('click', () => this.exportRecentInvoicesToExcel());
        document.getElementById('export-sheets-btn')?.addEventListener('click', () => this.exportToGoogleSheets());
        
        // Navigation
        document.querySelectorAll('.nav-btn, [data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                if (view) {
                    this.switchView(view);
                }
            });
        });

        // Client management
        document.getElementById('add-client-btn')?.addEventListener('click', () => {
            this.showClientModal();
        });
        
        document.getElementById('new-client-btn')?.addEventListener('click', () => {
            this.showClientModal();
        });
        
        document.getElementById('add-first-client-btn')?.addEventListener('click', () => {
            this.showClientModal();
        });

        // Client form
        document.getElementById('client-form')?.addEventListener('submit', this.handleClientSubmit.bind(this));

        // Settings form
        document.getElementById('save-settings-btn')?.addEventListener('click', this.handleSaveSettings.bind(this));
        document.getElementById('reset-seed-btn')?.addEventListener('click', this.handleResetSeed.bind(this));
        
        // Database
        document.getElementById('database-btn')?.addEventListener('click', () => {
            databaseService.showSetupModal();
        });

        // Browser navigation
        window.addEventListener('popstate', () => {
            this.switchView(this.getViewFromURL());
        });

        // Listen for state changes
        window.addEventListener('stateChange', () => {
            this.loadSettings();
        });
    }

    /**
     * Initialize router
     */
    initializeRouter() {
        // Handle initial URL
        const view = this.getViewFromURL();
        this.switchView(view);
    }

    /**
     * Initialize components
     */
    initializeComponents() {
        // Components are initialized in their respective modules
        // This method exists for future component initialization
    }

    /**
     * Get view from URL
     * @returns {string} View name
     */
    getViewFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('view') || 'dashboard';
    }

    /**
     * Switch to a different view
     * @param {string} viewName - View to switch to
     */
    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show target view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;

            // Update navigation
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.view === viewName) {
                    btn.classList.add('active');
                }
            });

            // Update URL
            const url = new URL(window.location);
            url.searchParams.set('view', viewName);
            window.history.pushState({}, '', url);

            // Initialize view-specific functionality
            this.initializeView(viewName);
        }
    }

    /**
     * Initialize view-specific functionality
     * @param {string} viewName - View being initialized
     */
    initializeView(viewName) {
        switch (viewName) {
            case 'dashboard':
                if (dashboard) {
                    dashboard.loadData();
                }
                break;
            case 'builder':
                if (invoiceBuilder) {
                    invoiceBuilder.init();
                }
                break;
            case 'clients':
                this.loadClientsView();
                break;
            case 'settings':
                this.loadSettingsView();
                break;
        }
    }

    /**
     * Load clients view
     */
    loadClientsView() {
        const clients = store.getClients();
        const tbody = document.getElementById('clients-tbody');
        const emptyState = document.getElementById('clients-empty');
        const table = document.getElementById('clients-table');

        if (clients.length === 0) {
            table.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            table.style.display = 'table';
            emptyState.style.display = 'none';

            tbody.innerHTML = clients.map(client => `
                <tr data-client-id="${client.id}">
                    <td>${client.name}</td>
                    <td>${client.company || '-'}</td>
                    <td>${client.email || '-'}</td>
                    <td>${client.phone || '-'}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn" onclick="app.editClient('${client.id}')" title="Edit">
                                ✏️
                            </button>
                            <button class="action-btn" onclick="app.deleteClient('${client.id}')" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // Initialize client search
        const searchInput = document.getElementById('client-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleClientSearch.bind(this));
        }
    }

    /**
     * Handle client search
     * @param {Event} e - Input event
     */
    handleClientSearch(e) {
        const query = e.target.value;
        const clients = store.searchClients(query);
        const tbody = document.getElementById('clients-tbody');

        if (clients.length === 0 && query.trim()) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-gray-500 p-4">
                        No clients found matching "${query}"
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = clients.map(client => `
                <tr data-client-id="${client.id}">
                    <td>${client.name}</td>
                    <td>${client.company || '-'}</td>
                    <td>${client.email || '-'}</td>
                    <td>${client.phone || '-'}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn" onclick="app.editClient('${client.id}')" title="Edit">
                                ✏️
                            </button>
                            <button class="action-btn" onclick="app.deleteClient('${client.id}')" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    }

    /**
     * Show client modal
     * @param {Object} client - Client to edit (null for new client)
     */
    showClientModal(client = null) {
        this.currentEditingClient = client;
        
        // Set modal title
        this.clientModal.setTitle(client ? 'Edit Client' : 'Add Client');
        
        // Reset form
        this.clientModal.resetForm();
        
        // Populate form if editing
        if (client) {
            const form = document.getElementById('client-form');
            document.getElementById('client-name').value = client.name || '';
            document.getElementById('client-company').value = client.company || '';
            document.getElementById('client-email').value = client.email || '';
            document.getElementById('client-phone').value = client.phone || '';
            document.getElementById('client-address').value = client.address || '';
            document.getElementById('client-tax-id').value = client.taxId || '';
        }
        
        this.clientModal.open();
    }

    /**
     * Handle client form submission
     * @param {Event} e - Submit event
     */
    async handleClientSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const clientData = {
            name: formData.get('client-name') || document.getElementById('client-name').value,
            company: formData.get('client-company') || document.getElementById('client-company').value,
            email: formData.get('client-email') || document.getElementById('client-email').value,
            phone: formData.get('client-phone') || document.getElementById('client-phone').value,
            address: formData.get('client-address') || document.getElementById('client-address').value,
            taxId: formData.get('client-tax-id') || document.getElementById('client-tax-id').value
        };

        // Create client instance for validation
        const client = new Client(clientData);
        const validation = client.validate();

        if (!validation.isValid) {
            toast.error(`Validation failed: ${validation.errors[0]}`);
            return;
        }

        try {
            if (this.currentEditingClient) {
                // Update existing client
                const updated = store.updateClient(this.currentEditingClient.id, clientData);
                if (updated) {
                    toast.success('Client updated successfully');
                } else {
                    toast.error('Failed to update client');
                }
            } else {
                // Add new client
                const added = store.addClient(clientData);
                if (added) {
                    toast.success('Client added successfully');
                } else {
                    toast.error('Failed to add client');
                }
            }

            this.clientModal.close();
            this.currentEditingClient = null;

            // Refresh views
            if (this.currentView === 'clients') {
                this.loadClientsView();
            }
            if (invoiceBuilder) {
                invoiceBuilder.loadClients();
            }

        } catch (error) {
            console.error('Client save failed:', error);
            toast.error('Failed to save client');
        }
    }

    /**
     * Edit client
     * @param {string} clientId - Client ID to edit
     */
    editClient(clientId) {
        const client = store.getClient(clientId);
        if (client) {
            this.showClientModal(client);
        } else {
            toast.error('Client not found');
        }
    }

    /**
     * Delete client
     * @param {string} clientId - Client ID to delete
     */
    deleteClient(clientId) {
        const client = store.getClient(clientId);
        if (!client) {
            toast.error('Client not found');
            return;
        }

        // Check if client is used in any invoices
        const invoices = store.getInvoices();
        const clientInvoices = invoices.filter(inv => inv.clientId === clientId);
        
        if (clientInvoices.length > 0) {
            toast.error(`Cannot delete client. Found ${clientInvoices.length} invoice(s) associated with this client.`);
            return;
        }

        const confirmMessage = `Are you sure you want to delete client "${client.name}"? This action cannot be undone.`;
        if (confirm(confirmMessage)) {
            const deleted = store.deleteClient(clientId);
            if (deleted) {
                toast.success('Client deleted successfully');
                this.loadClientsView();
            } else {
                toast.error('Failed to delete client');
            }
        }
    }

    /**
     * Load settings view
     */
    loadSettingsView() {
        const settings = store.getSettings();
        
        document.getElementById('invoice-prefix').value = settings.invoicePrefix || 'INV';
        document.getElementById('currency').value = settings.currency || 'PHP';
        document.getElementById('number-seed').value = settings.numberSeed || 1;
    }

    /**
     * Load settings into UI components
     */
    loadSettings() {
        const settings = store.getSettings();
        
        // Update form fields with current settings
        document.getElementById('company-name').value = settings.companyName || '';
        document.getElementById('company-email').value = settings.companyEmail || '';
        document.getElementById('company-phone').value = settings.companyPhone || '';
        document.getElementById('company-address').value = settings.companyAddress || '';
        document.getElementById('invoice-prefix').value = settings.invoicePrefix || 'INV';
        document.getElementById('currency').value = settings.currency || 'PHP';
        document.getElementById('number-seed').value = settings.numberSeed || 1;
        
        // Update currency formatter in other components
        if (dashboard) {
            dashboard.currencyFormatter.setCurrency(settings.currency);
        }
        if (invoiceBuilder) {
            invoiceBuilder.currencyFormatter.setCurrency(settings.currency);
        }
    }

    /**
     * Handle save settings
     */
    handleSaveSettings() {
        const settingsData = {
            // Company Information
            companyName: document.getElementById('company-name').value.trim(),
            companyEmail: document.getElementById('company-email').value.trim(),
            companyPhone: document.getElementById('company-phone').value.trim(),
            companyAddress: document.getElementById('company-address').value.trim(),
            // Invoice Settings
            invoicePrefix: document.getElementById('invoice-prefix').value.trim(),
            currency: document.getElementById('currency').value,
            numberSeed: parseInt(document.getElementById('number-seed').value) || 1
        };

        // Create settings instance for validation
        const settings = new Settings(settingsData);
        const validation = settings.validate();

        if (!validation.isValid) {
            toast.error(`Validation failed: ${validation.errors[0]}`);
            return;
        }

        try {
            store.updateSettings(settingsData);
            toast.success('Settings saved successfully');
            this.loadSettings();
        } catch (error) {
            console.error('Settings save failed:', error);
            toast.error('Failed to save settings');
        }
    }

    /**
     * Handle reset seed
     */
    handleResetSeed() {
        const confirmMessage = 'Are you sure you want to reset the invoice number seed? This will affect future invoice numbers.';
        if (confirm(confirmMessage)) {
            try {
                store.updateSettings({ numberSeed: 1 });
                document.getElementById('number-seed').value = 1;
                toast.success('Invoice number seed reset successfully');
            } catch (error) {
                console.error('Seed reset failed:', error);
                toast.error('Failed to reset seed');
            }
        }
    }

    /**
     * Get application statistics
     * @returns {Object} App statistics
     */
    getAppStats() {
        const clients = store.getClients();
        const invoices = store.getInvoices();
        const invoiceStats = store.getInvoiceStats();

        return {
            clients: clients.length,
            invoices: invoices.length,
            ...invoiceStats,
            lastActivity: Math.max(
                ...clients.map(c => c.updatedAt || c.createdAt),
                ...invoices.map(i => i.updatedAt || i.createdAt)
            )
        };
    }

    /**
     * Handle application errors
     * @param {Error} error - Error to handle
     */
    handleError(error) {
        console.error('Application error:', error);
        toast.error('An unexpected error occurred. Please refresh the page if problems persist.');
    }

    /**
     * Export Recent Invoices Table to Excel (.xlsx)
     */
    exportRecentInvoicesToExcel() {
        try {
            // Check if XLSX is available
            if (typeof XLSX === 'undefined') {
                toast.error('Excel export library not loaded. Please refresh the page and try again.');
                return;
            }

            const table = document.getElementById('invoices-table');
            if (!table) {
                alert('No invoices table found!');
                return;
            }

            // Get headers (excluding Actions column)
            const headers = Array.from(table.querySelectorAll('thead th'))
                .map(th => th.innerText.trim())
                .filter(text => text !== 'Actions');

            // Get visible rows
            const rows = Array.from(table.querySelectorAll('tbody tr'));
            const data = [headers];
            
            rows.forEach(row => {
                // Get all cells except the last one (Actions column)
                const cells = Array.from(row.querySelectorAll('td'))
                    .slice(0, -1)
                    .map(td => td.innerText.trim());
                data.push(cells);
            });

            // Create worksheet with proper formatting
            const ws = XLSX.utils.aoa_to_sheet(data);
            
            // Set column widths
            const colWidths = [15, 20, 15, 15, 15, 15];
            ws['!cols'] = colWidths.map(width => ({ width }));
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Recent Invoices');
            
            // Export to .xlsx file
            XLSX.writeFile(wb, 'Recent_Invoices.xlsx');
            
            toast.success('Excel file downloaded successfully!');
        } catch (error) {
            console.error('Excel export failed:', error);
            toast.error('Failed to export Excel file. ' + error.message);
        }
    }

    /**
     * Export Recent Invoices Table to Google Sheets
     */
    exportToGoogleSheets() {
        try {
            const table = document.getElementById('invoices-table');
            if (!table) {
                alert('No invoices table found!');
                return;
            }

            // Get headers (excluding Actions column)
            const headers = Array.from(table.querySelectorAll('thead th'))
                .map(th => th.innerText.trim())
                .filter(text => text !== 'Actions');

            // Get visible rows
            const rows = Array.from(table.querySelectorAll('tbody tr'));
            const data = [headers];
            
            rows.forEach(row => {
                // Get all cells except the last one (Actions column)
                const cells = Array.from(row.querySelectorAll('td'))
                    .slice(0, -1)
                    .map(td => td.innerText.trim());
                data.push(cells);
            });

            // Create CSV content
            const csvContent = data.map(row => row.join(',')).join('\\n');
            
            // Encode data to be used as URL parameter
            const encodedData = encodeURIComponent(csvContent);
            
            // Google Sheets import URL
            const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/1/edit#gid=0&range=A1&paste=${encodedData}`;
            
            // Open in new tab
            window.open(googleSheetsUrl, '_blank');
            
            toast.success('Data ready for Google Sheets. Paste data in the opened Google Sheet!');
        } catch (error) {
            console.error('Google Sheets export failed:', error);
            toast.error('Failed to export to Google Sheets. ' + error.message);
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new App();
        console.log('Invoice Automation app initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        
        // Show fallback error message
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; font-family: Arial, sans-serif;">
                <div>
                    <h1>Application Error</h1>
                    <p>Failed to initialize the Invoice Automation app.</p>
                    <p>Please refresh the page and try again.</p>
                    <button onclick="location.reload()" style="padding: 8px 16px; margin-top: 16px; border: 1px solid #ccc; background: #f5f5f5; cursor: pointer;">
                        Refresh Page
                    </button>
                </div>
            </div>
        `;
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.app) {
        window.app.handleError(event.error);
    }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.app) {
        window.app.handleError(event.reason);
    }
});

export default App;
