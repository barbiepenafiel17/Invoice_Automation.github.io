// API Configuration and Integration
class InvoiceAPI {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.token = localStorage.getItem('auth_token');
    }

    // Authentication headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication methods
    async googleSignIn(credential) {
        const data = await this.request('/auth/google-signin', {
            method: 'POST',
            body: JSON.stringify({ credential })
        });
        
        if (data.success) {
            this.token = data.token;
            localStorage.setItem('auth_token', this.token);
            localStorage.setItem('user_info', JSON.stringify(data.user));
        }
        
        return data;
    }

    async logout() {
        await this.request('/auth/logout', { method: 'POST' });
        this.token = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    // Invoice methods
    async getInvoices() {
        return await this.request('/invoices');
    }

    async getInvoice(id) {
        return await this.request(`/invoices/${id}`);
    }

    async createInvoice(invoiceData) {
        return await this.request('/invoices', {
            method: 'POST',
            body: JSON.stringify(invoiceData)
        });
    }

    async updateInvoice(id, invoiceData) {
        return await this.request(`/invoices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(invoiceData)
        });
    }

    async deleteInvoice(id) {
        return await this.request(`/invoices/${id}`, {
            method: 'DELETE'
        });
    }

    async updateInvoiceStatus(id, status) {
        return await this.request(`/invoices/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    async getInvoiceStats() {
        return await this.request('/invoices/stats/summary');
    }

    // Client methods
    async getClients() {
        return await this.request('/clients');
    }

    async getClient(id) {
        return await this.request(`/clients/${id}`);
    }

    async createClient(clientData) {
        return await this.request('/clients', {
            method: 'POST',
            body: JSON.stringify(clientData)
        });
    }

    async updateClient(id, clientData) {
        return await this.request(`/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(clientData)
        });
    }

    async deleteClient(id) {
        return await this.request(`/clients/${id}`, {
            method: 'DELETE'
        });
    }

    async searchClients(query) {
        return await this.request(`/clients/search/${encodeURIComponent(query)}`);
    }

    // Email methods
    async sendInvoice(emailData) {
        return await this.request('/email/send-invoice', {
            method: 'POST',
            body: JSON.stringify(emailData)
        });
    }

    async testEmail() {
        return await this.request('/email/test', {
            method: 'POST'
        });
    }

    async getEmailConfig() {
        return await this.request('/email/config-status');
    }

    // PDF methods
    async generatePDF(invoiceData, pdfBuffer = null) {
        return await this.request('/pdf/generate', {
            method: 'POST',
            body: JSON.stringify({ invoiceData, pdfBuffer })
        });
    }

    async savePDF(pdfBuffer, fileName, invoiceId) {
        return await this.request('/pdf/save', {
            method: 'POST',
            body: JSON.stringify({ pdfBuffer, fileName, invoiceId })
        });
    }

    // Utility methods
    async healthCheck() {
        return await this.request('/health');
    }

    isAuthenticated() {
        return !!this.token;
    }

    getUserInfo() {
        const userInfo = localStorage.getItem('user_info');
        return userInfo ? JSON.parse(userInfo) : null;
    }
}

// Global API instance
const api = new InvoiceAPI();

// Google Sign-In callback
function onGoogleSignIn(response) {
    api.googleSignIn(response.credential)
        .then(data => {
            console.log('Sign-in successful:', data);
            showNotification('Successfully signed in!', 'success');
            updateUIForAuthenticatedUser(data.user);
        })
        .catch(error => {
            console.error('Sign-in failed:', error);
            showNotification('Sign-in failed: ' + error.message, 'error');
        });
}

// Update UI for authenticated user
function updateUIForAuthenticatedUser(user) {
    // Hide sign-in section
    const authSection = document.querySelector('.auth-section');
    if (authSection) {
        authSection.style.display = 'none';
    }

    // Show user info
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-6';
    userInfo.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
                ${user.picture ? `<img src="${user.picture}" alt="${user.name}" class="w-10 h-10 rounded-full">` : ''}
                <div>
                    <h3 class="font-semibold text-gray-900">${user.name}</h3>
                    <p class="text-sm text-gray-600">${user.email}</p>
                </div>
            </div>
            <button onclick="handleLogout()" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Sign Out
            </button>
        </div>
    `;

    // Insert user info at the top of the main container
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(userInfo, container.firstChild);
    }

    // Load data
    loadDashboardData();
}

// Handle logout
async function handleLogout() {
    try {
        await api.logout();
        showNotification('Successfully signed out!', 'success');
        location.reload(); // Refresh page to reset UI
    } catch (error) {
        console.error('Logout failed:', error);
        showNotification('Logout failed: ' + error.message, 'error');
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load invoices
        const invoicesResponse = await api.getInvoices();
        console.log('Invoices:', invoicesResponse.invoices);

        // Load clients
        const clientsResponse = await api.getClients();
        console.log('Clients:', clientsResponse.clients);

        // Load stats
        const statsResponse = await api.getInvoiceStats();
        console.log('Stats:', statsResponse.stats);

        // Update UI with data
        updateDashboardUI(invoicesResponse.invoices, clientsResponse.clients, statsResponse.stats);

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showNotification('Failed to load data: ' + error.message, 'error');
    }
}

// Update dashboard UI with data
function updateDashboardUI(invoices, clients, stats) {
    // Update stats cards
    updateStatsCards(stats);
    
    // Update invoices list
    updateInvoicesList(invoices);
    
    // Update clients list
    updateClientsList(clients);
}

// Update stats cards
function updateStatsCards(stats) {
    const statsContainer = document.querySelector('.stats-container');
    if (!statsContainer) {
        // Create stats container if it doesn't exist
        const newStatsContainer = document.createElement('div');
        newStatsContainer.className = 'stats-container grid grid-cols-1 md:grid-cols-4 gap-6 mb-8';
        
        const container = document.querySelector('.container');
        if (container) {
            const userInfo = document.querySelector('.user-info');
            if (userInfo) {
                container.insertBefore(newStatsContainer, userInfo.nextSibling);
            }
        }
    }

    // Update or create stats cards
    const statsCards = [
        { title: 'Total Invoices', value: stats.total, color: 'bg-blue-50 text-blue-700 border-blue-200' },
        { title: 'Total Amount', value: `$${stats.totalAmount.toFixed(2)}`, color: 'bg-green-50 text-green-700 border-green-200' },
        { title: 'Paid Amount', value: `$${stats.paidAmount.toFixed(2)}`, color: 'bg-purple-50 text-purple-700 border-purple-200' },
        { title: 'Pending Amount', value: `$${stats.pendingAmount.toFixed(2)}`, color: 'bg-orange-50 text-orange-700 border-orange-200' }
    ];

    const statsHTML = statsCards.map(card => `
        <div class="stats-card ${card.color} rounded-lg p-6 border">
            <h3 class="text-sm font-medium opacity-75 mb-2">${card.title}</h3>
            <p class="text-2xl font-bold">${card.value}</p>
        </div>
    `).join('');

    const statsElement = document.querySelector('.stats-container');
    if (statsElement) {
        statsElement.innerHTML = statsHTML;
    }
}

// Update invoices list
function updateInvoicesList(invoices) {
    // Implementation for updating invoices list in UI
    console.log('Updating invoices list:', invoices);
}

// Update clients list
function updateClientsList(clients) {
    // Implementation for updating clients list in UI
    console.log('Updating clients list:', clients);
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Invoice Automation App initialized');
    
    // Check if user is already authenticated
    if (api.isAuthenticated()) {
        try {
            const userResponse = await api.getCurrentUser();
            updateUIForAuthenticatedUser(userResponse.user);
        } catch (error) {
            console.error('Failed to load user:', error);
            // Clear invalid token
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_info');
        }
    }

    // Test backend connection
    try {
        const health = await api.healthCheck();
        console.log('Backend connected:', health);
        showNotification('Connected to backend server', 'success');
    } catch (error) {
        console.error('Backend connection failed:', error);
        showNotification('Backend connection failed - some features may not work', 'error');
    }
});
