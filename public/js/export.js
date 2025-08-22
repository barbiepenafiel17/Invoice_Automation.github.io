// PDF/JSON Export & Import Functions
import { CurrencyFormatter, DateUtils } from './ui.js';
import store from './store.js';

/**
 * Export invoice to PDF using html2pdf
 * @param {Object} invoice - Invoice object to export
 * @returns {Promise} Export promise
 */
export async function exportToPDF(invoice) {
    try {
        // Check if html2pdf is available
        if (!window.html2pdf) {
            // Try to wait for it to load
            await waitForHtml2pdf();
        }
        
        if (!window.html2pdf) {
            throw new Error('html2pdf library not available. Please refresh the page and try again.');
        }
        
        const client = store.getClient(invoice.clientId);
        const settings = store.getSettings();
        const currencyFormatter = new CurrencyFormatter(settings.currency);
        
        // Create PDF content
        const pdfContent = createPDFContent(invoice, client, settings, currencyFormatter);
        
        // Configure PDF options
        const opt = {
            margin: [10, 10, 10, 10], // 10mm margins
            filename: `Invoice_${invoice.id}.pdf`,
            image: { 
                type: 'jpeg', 
                quality: 0.95 
            },
            html2canvas: { 
                scale: 1.5,
                useCORS: true,
                letterRendering: true,
                allowTaint: false,
                backgroundColor: '#ffffff'
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait',
                putOnlyUsedFonts: true,
                floatPrecision: 16
            }
        };
        
        // Create temporary container
        const container = document.createElement('div');
        container.innerHTML = pdfContent;
        container.className = 'pdf-export';
        container.style.cssText = `
            position: absolute;
            left: -9999px;
            top: 0;
            width: 210mm;
            background: white;
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.4;
        `;
        
        document.body.appendChild(container);
        
        try {
            // Generate PDF with error handling
            const pdfGenerator = html2pdf().set(opt).from(container);
            await pdfGenerator.save();
            return true;
        } catch (pdfError) {
            console.error('PDF generation error:', pdfError);
            throw new Error('Failed to generate PDF. Please try again or use the print option.');
        } finally {
            // Clean up
            if (container.parentNode) {
                document.body.removeChild(container);
            }
        }
    } catch (error) {
        console.error('PDF export error:', error);
        throw error;
    }
}

/**
 * Wait for html2pdf to load
 * @returns {Promise} Promise that resolves when html2pdf is available
 */
function waitForHtml2pdf() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 20;
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            if (window.html2pdf) {
                clearInterval(checkInterval);
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                resolve(); // Resolve anyway to continue with error handling
            }
        }, 100);
    });
}

/**
 * Export invoice with fallback methods
 * @param {Object} invoice - Invoice object to export
 * @returns {Promise} Export promise
 */
export async function exportInvoiceWithFallback(invoice) {
    try {
        // Try PDF export first
        await exportToPDF(invoice);
        return { success: true, method: 'pdf' };
    } catch (error) {
        console.warn('PDF export failed, trying print fallback:', error);
        
        try {
            // Fallback to print
            printInvoice(invoice);
            return { success: true, method: 'print', message: 'PDF export failed. Print dialog opened instead.' };
        } catch (printError) {
            console.error('Print fallback also failed:', printError);
            throw new Error('Both PDF export and print failed. Please try refreshing the page.');
        }
    }
}

/**
 * Create PDF content HTML
 * @param {Object} invoice - Invoice object
 * @param {Object} client - Client object
 * @param {Object} settings - Application settings
 * @param {CurrencyFormatter} formatter - Currency formatter
 * @returns {string} PDF HTML content
 */
function createPDFContent(invoice, client, settings, formatter) {
    return `
        <div class="invoice-document">
            <!-- Header -->
            <div class="invoice-header">
                <div class="company-info">
                    <div class="company-name">Your Company Name</div>
                    <div class="company-details">
                        Your Company Address<br>
                        City, State ZIP<br>
                        Phone: (555) 123-4567<br>
                        Email: info@yourcompany.com
                    </div>
                </div>
                <div class="invoice-info">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-number">#${invoice.id}</div>
                </div>
            </div>
            
            <!-- Invoice Details -->
            <div class="invoice-details">
                <div class="bill-to">
                    <h4>Bill To:</h4>
                    ${client ? `
                        <div class="client-info">
                            <strong>${client.name}</strong><br>
                            ${client.company ? `${client.company}<br>` : ''}
                            ${client.address ? `${client.address.replace(/\n/g, '<br>')}<br>` : ''}
                            ${client.email ? `Email: ${client.email}<br>` : ''}
                            ${client.phone ? `Phone: ${client.phone}<br>` : ''}
                            ${client.taxId ? `VAT/TIN: ${client.taxId}` : ''}
                        </div>
                    ` : '<div>No client information</div>'}
                </div>
                <div class="invoice-meta">
                    <h4>Invoice Details:</h4>
                    <div><strong>Issue Date:</strong> ${DateUtils.formatDate(invoice.issueDate)}</div>
                    <div><strong>Due Date:</strong> ${DateUtils.formatDate(invoice.dueDate)}</div>
                    <div><strong>Payment Terms:</strong> ${invoice.terms}</div>
                    <div><strong>Status:</strong> ${invoice.getDisplayStatus()}</div>
                    ${invoice.recurring.enabled ? `
                        <div><strong>Recurring:</strong> ${invoice.recurring.interval}</div>
                        ${invoice.recurring.nextRun ? `<div><strong>Next Run:</strong> ${DateUtils.formatDate(invoice.recurring.nextRun)}</div>` : ''}
                    ` : ''}
                </div>
            </div>
            
            <!-- Items Table -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th class="text-right">Qty</th>
                        <th class="text-right">Unit Price</th>
                        <th class="text-right">Tax %</th>
                        <th class="text-right">Discount %</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.items.map(item => {
                        const totals = item.calculateTotals();
                        return `
                            <tr>
                                <td>${item.description || 'Untitled item'}</td>
                                <td class="text-right">${item.qty}</td>
                                <td class="text-right">${formatter.format(item.unitPrice)}</td>
                                <td class="text-right">${item.taxRate}%</td>
                                <td class="text-right">${item.discountRate}%</td>
                                <td class="text-right">${formatter.format(totals.total)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <!-- Totals -->
            <div class="totals-section">
                <table class="totals-table">
                    <tr>
                        <td>Subtotal:</td>
                        <td class="text-right">${formatter.format(invoice.totals.subtotal)}</td>
                    </tr>
                    ${invoice.totals.discount > 0 ? `
                        <tr>
                            <td>Discount:</td>
                            <td class="text-right">-${formatter.format(invoice.totals.discount)}</td>
                        </tr>
                    ` : ''}
                    ${invoice.totals.tax > 0 ? `
                        <tr>
                            <td>Tax:</td>
                            <td class="text-right">${formatter.format(invoice.totals.tax)}</td>
                        </tr>
                    ` : ''}
                    ${invoice.shipping > 0 ? `
                        <tr>
                            <td>Shipping:</td>
                            <td class="text-right">${formatter.format(invoice.shipping)}</td>
                        </tr>
                    ` : ''}
                    <tr class="total-row">
                        <td><strong>Grand Total:</strong></td>
                        <td class="text-right"><strong>${formatter.format(invoice.totals.grand)}</strong></td>
                    </tr>
                </table>
            </div>
            
            <!-- Notes -->
            ${invoice.notes ? `
                <div class="notes-section">
                    <div class="notes-title">Notes:</div>
                    <div class="notes-content">${invoice.notes.replace(/\n/g, '<br>')}</div>
                </div>
            ` : ''}
            
            <!-- Footer -->
            <div class="footer">
                <p>Thank you for your business!</p>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
        </div>
    `;
}

/**
 * Export invoice as JSON
 * @param {Object} invoice - Invoice object to export
 * @returns {string} JSON string
 */
export function exportInvoiceJSON(invoice) {
    const client = store.getClient(invoice.clientId);
    const exportData = {
        invoice: invoice,
        client: client,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    return JSON.stringify(exportData, null, 2);
}

/**
 * Export all data as JSON backup
 * @returns {string} Complete data backup as JSON
 */
export function exportBackupJSON() {
    const data = store.getState();
    const backupData = {
        ...data,
        backup: {
            date: new Date().toISOString(),
            version: '1.0',
            type: 'complete'
        }
    };
    
    return JSON.stringify(backupData, null, 2);
}

/**
 * Import data from JSON backup
 * @param {string} jsonData - JSON string to import
 * @returns {boolean} Success status
 */
export function importBackupJSON(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        
        // Validate data structure
        if (!validateImportData(data)) {
            throw new Error('Invalid data structure');
        }
        
        // Import data
        return store.importJSON(jsonData);
    } catch (error) {
        console.error('Import failed:', error);
        return false;
    }
}

/**
 * Validate import data structure
 * @param {Object} data - Data to validate
 * @returns {boolean} Is valid
 */
function validateImportData(data) {
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
 * Export clients as CSV
 * @returns {string} CSV string
 */
export function exportClientsCSV() {
    const clients = store.getClients();
    
    const headers = ['ID', 'Name', 'Company', 'Email', 'Phone', 'Address', 'VAT/TIN', 'Created Date'];
    const csvRows = [headers.join(',')];
    
    clients.forEach(client => {
        const row = [
            escapeCSV(client.id),
            escapeCSV(client.name),
            escapeCSV(client.company || ''),
            escapeCSV(client.email || ''),
            escapeCSV(client.phone || ''),
            escapeCSV(client.address ? client.address.replace(/\n/g, ' ') : ''),
            escapeCSV(client.taxId || ''),
            escapeCSV(new Date(client.createdAt).toLocaleDateString())
        ];
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
}

/**
 * Export invoices as CSV
 * @returns {string} CSV string
 */
export function exportInvoicesCSV() {
    const invoices = store.getInvoices();
    const clients = store.getClients();
    const settings = store.getSettings();
    const formatter = new CurrencyFormatter(settings.currency);
    
    const headers = [
        'Invoice ID', 'Client Name', 'Company', 'Issue Date', 'Due Date', 
        'Payment Terms', 'Status', 'Subtotal', 'Tax', 'Discount', 'Shipping', 
        'Grand Total', 'Notes', 'Created Date'
    ];
    const csvRows = [headers.join(',')];
    
    invoices.forEach(invoice => {
        const client = clients.find(c => c.id === invoice.clientId);
        const row = [
            escapeCSV(invoice.id),
            escapeCSV(client ? client.name : 'Unknown'),
            escapeCSV(client ? client.company || '' : ''),
            escapeCSV(invoice.issueDate),
            escapeCSV(invoice.dueDate),
            escapeCSV(invoice.terms),
            escapeCSV(invoice.getDisplayStatus()),
            escapeCSV(invoice.totals.subtotal.toString()),
            escapeCSV(invoice.totals.tax.toString()),
            escapeCSV(invoice.totals.discount.toString()),
            escapeCSV(invoice.shipping.toString()),
            escapeCSV(invoice.totals.grand.toString()),
            escapeCSV(invoice.notes.replace(/\n/g, ' ')),
            escapeCSV(new Date(invoice.createdAt).toLocaleDateString())
        ];
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
}

/**
 * Escape CSV field
 * @param {string} field - Field to escape
 * @returns {string} Escaped field
 */
function escapeCSV(field) {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
}

/**
 * Download text file
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
export function downloadTextFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
}

/**
 * Print invoice
 * @param {Object} invoice - Invoice to print
 */
export function printInvoice(invoice) {
    const client = store.getClient(invoice.clientId);
    const settings = store.getSettings();
    const formatter = new CurrencyFormatter(settings.currency);
    
    const printContent = createPDFContent(invoice, client, settings, formatter);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice ${invoice.id}</title>
            <style>
                ${getPrintStyles()}
            </style>
        </head>
        <body>
            <div class="pdf-export">
                ${printContent}
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

/**
 * Get print styles
 * @returns {string} CSS styles for printing
 */
function getPrintStyles() {
    return `
        @media print {
            @page { 
                size: A4; 
                margin: 12mm; 
            }
            body { 
                font-family: Arial, sans-serif; 
                font-size: 12pt; 
                line-height: 1.4; 
                color: black;
            }
        }
        
        .pdf-export {
            background: white;
            padding: 0;
            font-family: Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.4;
            color: black;
            max-width: 100%;
        }
        
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24pt;
            border-bottom: 2pt solid black;
            padding-bottom: 12pt;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-name {
            font-size: 20pt;
            font-weight: bold;
            margin-bottom: 8pt;
        }
        
        .invoice-info {
            text-align: right;
        }
        
        .invoice-title {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 4pt;
        }
        
        .invoice-details {
            display: flex;
            gap: 24pt;
            margin: 24pt 0;
        }
        
        .bill-to,
        .invoice-meta {
            flex: 1;
            padding: 12pt;
            border: 1pt solid black;
        }
        
        .bill-to h4,
        .invoice-meta h4 {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 8pt;
            border-bottom: 1pt solid #ccc;
            padding-bottom: 4pt;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 24pt 0;
        }
        
        .items-table th,
        .items-table td {
            border: 1pt solid black;
            padding: 8pt;
            text-align: left;
        }
        
        .items-table th {
            background: #f0f0f0;
            font-weight: bold;
        }
        
        .text-right {
            text-align: right;
        }
        
        .totals-section {
            margin-top: 24pt;
            display: flex;
            justify-content: flex-end;
        }
        
        .totals-table {
            width: 300pt;
            border-collapse: collapse;
        }
        
        .totals-table td {
            padding: 6pt 12pt;
            border-bottom: 1pt solid #ddd;
        }
        
        .totals-table .total-row td {
            border-top: 2pt solid black;
            border-bottom: 2pt solid black;
            font-weight: bold;
            font-size: 14pt;
            background: #f0f0f0;
        }
        
        .notes-section {
            margin-top: 24pt;
            border-top: 1pt solid #ddd;
            padding-top: 12pt;
        }
        
        .notes-title {
            font-weight: bold;
            margin-bottom: 8pt;
        }
        
        .footer {
            margin-top: 24pt;
            text-align: center;
            font-size: 10pt;
            color: #666;
            border-top: 1pt solid #ddd;
            padding-top: 12pt;
        }
    `;
}

/**
 * Generate payment link text (stub implementation)
 * @param {Object} invoice - Invoice object
 * @returns {string} Payment link text
 */
export function generatePaymentLink(invoice) {
    const client = store.getClient(invoice.clientId);
    const settings = store.getSettings();
    const formatter = new CurrencyFormatter(settings.currency);
    
    return `
Invoice Payment Request

Invoice: ${invoice.id}
Client: ${client ? client.name : 'Unknown'}
Amount: ${formatter.format(invoice.totals.grand)}
Due Date: ${DateUtils.formatDate(invoice.dueDate)}

Please remit payment for the above invoice.

Thank you for your business!
    `.trim();
}
