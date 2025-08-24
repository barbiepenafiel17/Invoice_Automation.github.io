// Dashboard Statistics, List, and Filters
import { TableSorter, Search, CurrencyFormatter, DateUtils, toast } from './ui.js';
import store from './store.js';

export class Dashboard {
    constructor() {
        this.currencyFormatter = new CurrencyFormatter();
        this.tableSorter = null;
        this.search = null;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize dashboard
     */
    init() {
        if (this.isInitialized) return;
        
        this.bindEvents();
        this.initializeComponents();
        this.loadData();
        
        // Listen for state changes
        window.addEventListener('stateChange', () => {
            this.loadData();
        });
        
        // Listen for invoice saves
        window.addEventListener('invoiceSaved', () => {
            this.loadData();
        });
        
        this.isInitialized = true;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Export/Import actions
        // Excel export is now handled in app.js with button id="export-excel-btn"
        document.getElementById('import-json-btn')?.addEventListener('click', this.handleImportJSON.bind(this));
        
        // File input for JSON import
        document.getElementById('json-file-input')?.addEventListener('change', this.handleFileImport.bind(this));
    }

    /**
     * Initialize dashboard components
     */
    initializeComponents() {
        // Initialize table sorting
        this.tableSorter = new TableSorter('invoices-table');
        
        // Initialize search
        this.search = new Search('invoice-search', null, this.handleSearch.bind(this));
        
        // Set currency formatter
        const settings = store.getSettings();
        this.currencyFormatter.setCurrency(settings.currency);
    }

    /**
     * Load dashboard data
     */
    loadData() {
        this.updateKPIs();
        this.updateInvoicesList();
        this.updateEmptyStates();
    }

    /**
     * Update KPI cards
     */
    updateKPIs() {
        const stats = store.getInvoiceStats();
        const settings = store.getSettings();
        
        // Update KPI values
        document.getElementById('total-invoices').textContent = stats.total;
        document.getElementById('unpaid-invoices').textContent = stats.unpaid;
        document.getElementById('overdue-invoices').textContent = stats.overdue;
        document.getElementById('collected-month').textContent = 
            this.currencyFormatter.format(stats.collectedThisMonth);
    }

    /**
     * Update invoices list
     * @param {Array} invoices - Optional filtered invoices array
     */
    updateInvoicesList(invoices = null) {
        const invoicesList = invoices || store.getInvoices();
        const tbody = document.getElementById('invoices-tbody');
        const clients = store.getClients();
        
        if (!tbody) return;
        
        // Sort by creation date (newest first)
        const sortedInvoices = [...invoicesList].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        tbody.innerHTML = sortedInvoices.map(invoice => 
            this.createInvoiceRow(invoice, clients)
        ).join('');
    }

    /**
     * Create invoice table row
     * @param {Object} invoice - Invoice object
     * @param {Array} clients - Clients array
     * @returns {string} HTML string for table row
     */
    createInvoiceRow(invoice, clients) {
        const client = clients.find(c => c.id === invoice.clientId);
        const clientName = client ? 
            (client.company ? `${client.name} (${client.company})` : client.name) : 
            'Unknown Client';
        
        // Determine status and badge class
        const isOverdue = invoice.status === 'unpaid' && new Date(invoice.dueDate) < new Date();
        const isDueSoon = invoice.status === 'unpaid' && 
            new Date(invoice.dueDate) >= new Date() && 
            new Date(invoice.dueDate) <= new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
        
        let status = invoice.status;
        let badgeClass = `badge-${status}`;
        
        if (isOverdue) {
            status = 'overdue';
            badgeClass = 'badge-overdue';
        } else if (isDueSoon) {
            status = 'due soon';
            badgeClass = 'badge-due-soon';
        }
        
        return `
            <tr data-invoice-id="${invoice.id}">
                <td data-id="${invoice.id}">
                    <strong>${invoice.id}</strong>
                </td>
                <td data-client="${clientName}">
                    ${clientName}
                </td>
                <td data-issueDate="${invoice.issueDate}">
                    ${DateUtils.formatDate(invoice.issueDate)}
                </td>
                <td data-dueDate="${invoice.dueDate}">
                    ${DateUtils.formatDate(invoice.dueDate)}
                    ${isDueSoon ? ' <small class="text-gray-500">(Due Soon)</small>' : ''}
                    ${isOverdue ? ' <small class="text-gray-700">(Overdue)</small>' : ''}
                </td>
                <td data-total="${invoice.totals.grand}" class="text-right">
                    ${this.currencyFormatter.format(invoice.totals.grand)}
                </td>
                <td data-status="${status}">
                    <span class="badge ${badgeClass}">
                        ${status.toUpperCase()}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn" onclick="dashboard.editInvoice('${invoice.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="action-btn" onclick="dashboard.viewInvoice('${invoice.id}')" title="View">
                            👁️
                        </button>
                        ${invoice.status !== 'paid' ? `
                            <button class="action-btn" onclick="dashboard.markPaid('${invoice.id}')" title="Mark as Paid">
                                ✓
                            </button>
                        ` : ''}
                        <button class="action-btn" onclick="dashboard.duplicateInvoice('${invoice.id}')" title="Duplicate">
                            📋
                        </button>
                        <button class="action-btn" onclick="dashboard.exportInvoicePDF('${invoice.id}')" title="Export PDF">
                            📄
                        </button>
                        <button class="action-btn" onclick="dashboard.deleteInvoice('${invoice.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Update empty states visibility
     */
    updateEmptyStates() {
        const invoices = store.getInvoices();
        const invoicesTable = document.getElementById('invoices-table');
        const invoicesEmpty = document.getElementById('invoices-empty');
        
        if (invoices.length === 0) {
            invoicesTable.style.display = 'none';
            invoicesEmpty.style.display = 'block';
        } else {
            invoicesTable.style.display = 'table';
            invoicesEmpty.style.display = 'none';
        }
    }

    /**
     * Handle search functionality
     * @param {string} query - Search query
     */
    handleSearch(query) {
        const filteredInvoices = store.searchInvoices(query);
        this.updateInvoicesList(filteredInvoices);
        
        // Update empty state for search results
        const tbody = document.getElementById('invoices-tbody');
        if (tbody && tbody.children.length === 0 && query.trim()) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-gray-500 p-4">
                        No invoices found matching "${query}"
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Edit invoice
     * @param {string} invoiceId - Invoice ID to edit
     */
    editInvoice(invoiceId) {
        // Switch to builder view and load invoice
        window.app.switchView('builder');
        
        // Wait a bit for view to load, then load the invoice
        setTimeout(() => {
            if (window.invoiceBuilder) {
                window.invoiceBuilder.loadInvoice(invoiceId);
            }
        }, 100);
    }

    /**
     * View invoice (same as edit for now)
     * @param {string} invoiceId - Invoice ID to view
     */
    viewInvoice(invoiceId) {
        this.editInvoice(invoiceId);
    }

    /**
     * Mark invoice as paid
     * @param {string} invoiceId - Invoice ID
     */
    markPaid(invoiceId) {
        const result = store.markPaid(invoiceId);
        if (result) {
            toast.success('Invoice marked as paid');
            this.loadData();
        } else {
            toast.error('Failed to mark invoice as paid');
        }
    }

    /**
     * Duplicate invoice
     * @param {string} invoiceId - Invoice ID to duplicate
     */
    duplicateInvoice(invoiceId) {
        const duplicated = store.duplicateInvoice(invoiceId);
        if (duplicated) {
            toast.success('Invoice duplicated');
            this.loadData();
            
            // Optionally edit the duplicated invoice
            setTimeout(() => {
                this.editInvoice(duplicated.id);
            }, 500);
        } else {
            toast.error('Failed to duplicate invoice');
        }
    }

    /**
     * Export invoice to PDF
     * @param {string} invoiceId - Invoice ID to export
     */
    async exportInvoicePDF(invoiceId) {
        try {
            const invoice = store.getInvoice(invoiceId);
            if (!invoice) {
                toast.error('Invoice not found');
                return;
            }
            
            const { exportToPDF } = await import('./export.js');
            await exportToPDF(invoice);
            toast.success('PDF exported successfully');
        } catch (error) {
            console.error('PDF export failed:', error);
            toast.error('Failed to export PDF');
        }
    }

    /**
     * Delete invoice
     * @param {string} invoiceId - Invoice ID to delete
     */
    deleteInvoice(invoiceId) {
        const invoice = store.getInvoice(invoiceId);
        if (!invoice) {
            toast.error('Invoice not found');
            return;
        }
        
        const confirmMessage = `Are you sure you want to delete invoice ${invoice.id}? This action cannot be undone.`;
        if (confirm(confirmMessage)) {
            const deleted = store.deleteInvoice(invoiceId);
            if (deleted) {
                toast.success('Invoice deleted');
                this.loadData();
            } else {
                toast.error('Failed to delete invoice');
            }
        }
    }

    /**
     * Handle export JSON
     */
    handleExportJSON() {
        try {
            const jsonData = store.exportJSON();
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            toast.success('Data exported successfully');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export data');
        }
    }

    /**
     * Handle import JSON button
     */
    handleImportJSON() {
        document.getElementById('json-file-input').click();
    }

    /**
     * Handle file import
     * @param {Event} e - File input change event
     */
    async handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.type !== 'application/json') {
            toast.error('Please select a JSON file');
            return;
        }
        
        try {
            const text = await file.text();
            
            // Confirm import
            const confirmMessage = 'This will replace all existing data. Are you sure you want to continue?';
            if (!confirm(confirmMessage)) {
                return;
            }
            
            const success = store.importJSON(text);
            if (success) {
                toast.success('Data imported successfully');
                this.loadData();
                
                // Update other components
                if (window.invoiceBuilder) {
                    window.invoiceBuilder.loadClients();
                }
                if (window.clientManager) {
                    window.clientManager.loadClients();
                }
            } else {
                toast.error('Invalid file format or corrupted data');
            }
        } catch (error) {
            console.error('Import failed:', error);
            toast.error('Failed to import data');
        } finally {
            // Clear file input
            e.target.value = '';
        }
    }

    /**
     * Get filtered invoices by status
     * @param {string} status - Status to filter by
     * @returns {Array} Filtered invoices
     */
    getInvoicesByStatus(status) {
        const invoices = store.getInvoices();
        const now = new Date();
        
        return invoices.filter(invoice => {
            switch (status) {
                case 'unpaid':
                    return invoice.status === 'unpaid' && new Date(invoice.dueDate) >= now;
                case 'overdue':
                    return invoice.status === 'unpaid' && new Date(invoice.dueDate) < now;
                case 'due-soon':
                    const dueDate = new Date(invoice.dueDate);
                    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
                    return invoice.status === 'unpaid' && dueDate >= now && dueDate <= fiveDaysFromNow;
                case 'paid':
                    return invoice.status === 'paid';
                default:
                    return true;
            }
        });
    }

    /**
     * Filter invoices by status
     * @param {string} status - Status to filter by
     */
    filterByStatus(status) {
        const filteredInvoices = this.getInvoicesByStatus(status);
        this.updateInvoicesList(filteredInvoices);
        
        // Update search placeholder
        const searchInput = document.getElementById('invoice-search');
        if (searchInput) {
            searchInput.placeholder = status ? 
                `Search ${status} invoices...` : 
                'Search invoices...';
        }
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        const searchInput = document.getElementById('invoice-search');
        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = 'Search invoices...';
        }
        
        this.updateInvoicesList();
    }

    /**
     * Get dashboard statistics summary
     * @returns {Object} Statistics summary
     */
    getStatsSummary() {
        const stats = store.getInvoiceStats();
        const invoices = store.getInvoices();
        
        const totalValue = invoices.reduce((sum, invoice) => sum + invoice.totals.grand, 0);
        const unpaidValue = invoices
            .filter(inv => inv.status === 'unpaid')
            .reduce((sum, invoice) => sum + invoice.totals.grand, 0);
        
        return {
            ...stats,
            totalValue,
            unpaidValue,
            averageInvoiceValue: stats.total > 0 ? totalValue / stats.total : 0,
            collectionRate: totalValue > 0 ? ((totalValue - unpaidValue) / totalValue) * 100 : 0
        };
    }
}

// Create global instance
const dashboard = new Dashboard();

// Make available globally for event handlers
window.dashboard = dashboard;

export default dashboard;
