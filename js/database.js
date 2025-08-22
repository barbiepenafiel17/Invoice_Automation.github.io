// Database Service - MySQL Integration
import { toast } from './ui.js';

/**
 * Database service for Invoice Automation
 * Connects to MySQL database via PHP API
 */
export class DatabaseService {
    constructor() {
        // Use different API endpoints based on environment
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.baseUrl = window.location.origin + '/php/api';
        } else {
            this.baseUrl = window.location.origin + '/api/database';
        }
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
    }
    
    /**
     * Test database connection
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/?path=test`);
            const result = await response.json();
            
            if (result.success) {
                this.isConnected = true;
                this.connectionStatus = 'connected';
                console.log('✅ Database connected:', result.server_info);
                return result;
            } else {
                this.isConnected = false;
                this.connectionStatus = 'error';
                console.error('❌ Database connection failed:', result.message);
                return result;
            }
        } catch (error) {
            this.isConnected = false;
            this.connectionStatus = 'error';
            console.error('❌ Database connection error:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Setup database (create tables)
     */
    async setupDatabase() {
        try {
            toast.info('Setting up database...');
            
            const response = await fetch(`${this.baseUrl}/?path=setup`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                toast.success('Database setup completed!');
                this.isConnected = true;
                this.connectionStatus = 'connected';
            } else {
                toast.error('Database setup failed: ' + result.message);
            }
            
            return result;
        } catch (error) {
            console.error('Database setup error:', error);
            toast.error('Database setup failed: ' + error.message);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Migrate data from localStorage to database
     */
    async migrateFromLocalStorage() {
        try {
            // Get data from localStorage
            const localData = localStorage.getItem('invoiceApp:v1');
            if (!localData) {
                toast.info('No local data found to migrate');
                return { success: true, message: 'No data to migrate' };
            }
            
            const data = JSON.parse(localData);
            toast.info('Migrating data to database...');
            
            const response = await fetch(`${this.baseUrl}/?path=migrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const { migrated } = result;
                const message = `Migration completed! 
                    Clients: ${migrated.clients}, 
                    Invoices: ${migrated.invoices}, 
                    Settings: ${migrated.settings}`;
                toast.success(message);
                
                // Backup localStorage and clear it
                localStorage.setItem('invoiceApp:backup', localData);
                localStorage.removeItem('invoiceApp:v1');
            } else {
                toast.error('Migration failed: ' + result.message);
            }
            
            return result;
        } catch (error) {
            console.error('Migration error:', error);
            toast.error('Migration failed: ' + error.message);
            return { success: false, message: error.message };
        }
    }
    
    // Client Operations
    
    /**
     * Get all clients
     */
    async getClients() {
        try {
            const response = await fetch(`${this.baseUrl}/?path=clients`);
            const result = await response.json();
            
            if (response.ok) {
                return result.clients || [];
            } else {
                throw new Error(result.error || 'Failed to fetch clients');
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
            toast.error('Failed to load clients: ' + error.message);
            return [];
        }
    }
    
    /**
     * Get single client
     */
    async getClient(id) {
        try {
            const response = await fetch(`${this.baseUrl}/?path=clients/${id}`);
            const result = await response.json();
            
            if (response.ok) {
                return result.client;
            } else {
                throw new Error(result.error || 'Client not found');
            }
        } catch (error) {
            console.error('Error fetching client:', error);
            return null;
        }
    }
    
    /**
     * Create new client
     */
    async addClient(clientData) {
        try {
            const response = await fetch(`${this.baseUrl}/?path=clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clientData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                toast.success('Client created successfully!');
                return result.client;
            } else {
                throw new Error(result.error || 'Failed to create client');
            }
        } catch (error) {
            console.error('Error creating client:', error);
            toast.error('Failed to create client: ' + error.message);
            return null;
        }
    }
    
    /**
     * Update client
     */
    async updateClient(id, updates) {
        try {
            const response = await fetch(`${this.baseUrl}/?path=clients/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                toast.success('Client updated successfully!');
                return result.client;
            } else {
                throw new Error(result.error || 'Failed to update client');
            }
        } catch (error) {
            console.error('Error updating client:', error);
            toast.error('Failed to update client: ' + error.message);
            return null;
        }
    }
    
    /**
     * Delete client
     */
    async deleteClient(id) {
        try {
            const response = await fetch(`${this.baseUrl}/?path=clients/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                toast.success('Client deleted successfully!');
                return true;
            } else {
                throw new Error(result.error || 'Failed to delete client');
            }
        } catch (error) {
            console.error('Error deleting client:', error);
            toast.error('Failed to delete client: ' + error.message);
            return false;
        }
    }
    
    // Invoice Operations
    
    /**
     * Get all invoices
     */
    async getInvoices() {
        try {
            const response = await fetch(`${this.baseUrl}/?path=invoices`);
            const result = await response.json();
            
            if (response.ok) {
                return result.invoices || [];
            } else {
                throw new Error(result.error || 'Failed to fetch invoices');
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
            toast.error('Failed to load invoices: ' + error.message);
            return [];
        }
    }
    
    /**
     * Get single invoice
     */
    async getInvoice(id) {
        try {
            const response = await fetch(`${this.baseUrl}/?path=invoices/${id}`);
            const result = await response.json();
            
            if (response.ok) {
                return result.invoice;
            } else {
                throw new Error(result.error || 'Invoice not found');
            }
        } catch (error) {
            console.error('Error fetching invoice:', error);
            return null;
        }
    }
    
    /**
     * Save invoice (create or update)
     */
    async saveInvoice(invoiceData) {
        try {
            const isUpdate = !!invoiceData.id;
            const method = isUpdate ? 'PUT' : 'POST';
            const path = isUpdate ? `invoices/${invoiceData.id}` : 'invoices';
            
            const response = await fetch(`${this.baseUrl}/?path=${path}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                const action = isUpdate ? 'updated' : 'created';
                toast.success(`Invoice ${action} successfully!`);
                return result.invoice;
            } else {
                throw new Error(result.error || `Failed to ${isUpdate ? 'update' : 'create'} invoice`);
            }
        } catch (error) {
            console.error('Error saving invoice:', error);
            const action = invoiceData.id ? 'update' : 'create';
            toast.error(`Failed to ${action} invoice: ` + error.message);
            return null;
        }
    }
    
    /**
     * Delete invoice
     */
    async deleteInvoice(id) {
        try {
            const response = await fetch(`${this.baseUrl}/?path=invoices/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                toast.success('Invoice deleted successfully!');
                return true;
            } else {
                throw new Error(result.error || 'Failed to delete invoice');
            }
        } catch (error) {
            console.error('Error deleting invoice:', error);
            toast.error('Failed to delete invoice: ' + error.message);
            return false;
        }
    }
    
    // Settings Operations
    
    /**
     * Get settings
     */
    async getSettings() {
        try {
            const response = await fetch(`${this.baseUrl}/?path=settings`);
            const result = await response.json();
            
            if (response.ok) {
                return result.settings || {};
            } else {
                throw new Error(result.error || 'Failed to fetch settings');
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            return {};
        }
    }
    
    /**
     * Update settings
     */
    async updateSettings(settingsUpdate) {
        try {
            const response = await fetch(`${this.baseUrl}/?path=settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsUpdate)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                toast.success('Settings updated successfully!');
                return result.settings;
            } else {
                throw new Error(result.error || 'Failed to update settings');
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            toast.error('Failed to update settings: ' + error.message);
            return null;
        }
    }
    
    // Statistics
    
    /**
     * Get application statistics
     */
    async getStats() {
        try {
            const response = await fetch(`${this.baseUrl}/?path=stats`);
            const result = await response.json();
            
            if (response.ok) {
                return result.stats || {};
            } else {
                throw new Error(result.error || 'Failed to fetch statistics');
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            return {};
        }
    }
    
    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            status: this.connectionStatus
        };
    }
    
    /**
     * Show database setup modal
     */
    showSetupModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>🗄️ Database Setup</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="setup-info">
                        <p>Connect your Invoice Automation app to a MySQL database for persistent storage.</p>
                        
                        <div class="current-status">
                            <h4>Current Status:</h4>
                            <div id="db-status">
                                <span style="color: orange;">⚠️ Database not connected</span>
                            </div>
                        </div>
                        
                        <div class="setup-steps">
                            <h4>Setup Process:</h4>
                            <ol>
                                <li><strong>Test Connection:</strong> Check if XAMPP MySQL is running</li>
                                <li><strong>Create Database:</strong> Setup tables and structure</li>
                                <li><strong>Migrate Data:</strong> Transfer existing localStorage data (optional)</li>
                            </ol>
                        </div>
                        
                        <div class="setup-actions">
                            <button class="btn btn-primary" id="test-db-connection">
                                🔍 Test Database Connection
                            </button>
                            <button class="btn btn-success" id="setup-database" disabled>
                                🚀 Setup Database
                            </button>
                            <button class="btn btn-info" id="migrate-data" disabled>
                                📦 Migrate Local Data
                            </button>
                        </div>
                        
                        <div class="requirements">
                            <h4>Requirements:</h4>
                            <ul>
                                <li>✅ XAMPP installed and running</li>
                                <li>✅ MySQL/MariaDB service active</li>
                                <li>✅ PHP configured with PDO</li>
                                <li>⚠️ Database will be created automatically</li>
                            </ul>
                        </div>
                        
                        <div class="benefits">
                            <h4>Benefits:</h4>
                            <ul>
                                <li>🔄 Persistent data storage</li>
                                <li>🔍 Advanced search capabilities</li>
                                <li>📊 Better reporting and analytics</li>
                                <li>🚀 Improved performance</li>
                                <li>🔒 Data backup and recovery</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Event handlers
        const closeModal = () => document.body.removeChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Test connection
        modal.querySelector('#test-db-connection').addEventListener('click', async () => {
            const btn = modal.querySelector('#test-db-connection');
            const statusDiv = modal.querySelector('#db-status');
            
            btn.textContent = '🔄 Testing...';
            btn.disabled = true;
            
            const result = await this.testConnection();
            
            if (result.success) {
                statusDiv.innerHTML = `<span style="color: green;">✅ Database connected successfully!</span>`;
                modal.querySelector('#setup-database').disabled = false;
            } else {
                statusDiv.innerHTML = `<span style="color: red;">❌ Connection failed: ${result.message}</span>`;
            }
            
            btn.textContent = '🔍 Test Database Connection';
            btn.disabled = false;
        });
        
        // Setup database
        modal.querySelector('#setup-database').addEventListener('click', async () => {
            const btn = modal.querySelector('#setup-database');
            const statusDiv = modal.querySelector('#db-status');
            
            btn.textContent = '⏳ Setting up...';
            btn.disabled = true;
            
            const result = await this.setupDatabase();
            
            if (result.success) {
                statusDiv.innerHTML = `<span style="color: green;">✅ Database setup completed!</span>`;
                modal.querySelector('#migrate-data').disabled = false;
            } else {
                statusDiv.innerHTML = `<span style="color: red;">❌ Setup failed: ${result.message}</span>`;
            }
            
            btn.textContent = '🚀 Setup Database';
            btn.disabled = false;
        });
        
        // Migrate data
        modal.querySelector('#migrate-data').addEventListener('click', async () => {
            const btn = modal.querySelector('#migrate-data');
            const statusDiv = modal.querySelector('#db-status');
            
            btn.textContent = '📦 Migrating...';
            btn.disabled = true;
            
            const result = await this.migrateFromLocalStorage();
            
            if (result.success) {
                statusDiv.innerHTML = `<span style="color: green;">✅ Data migration completed!</span>`;
                
                // Show success message and close modal
                setTimeout(() => {
                    toast.success('Database setup complete! Your app is now using MySQL storage.');
                    closeModal();
                    
                    // Refresh the page to use database
                    setTimeout(() => window.location.reload(), 1000);
                }, 1000);
            } else {
                statusDiv.innerHTML = `<span style="color: red;">❌ Migration failed: ${result.message}</span>`;
            }
            
            btn.textContent = '📦 Migrate Local Data';
            btn.disabled = false;
        });
        
        document.body.appendChild(modal);
    }
}

// Create and export database service instance
const databaseService = new DatabaseService();

export default databaseService;
