const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('./auth');
const router = express.Router();

// In-memory storage for invoices (replace with database in production)
let invoices = [];

// Get all invoices for the authenticated user
router.get('/', verifyToken, (req, res) => {
  try {
    const userInvoices = invoices.filter(invoice => invoice.userId === req.user.id);
    res.json({
      success: true,
      invoices: userInvoices,
      count: userInvoices.length
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get a specific invoice by ID
router.get('/:id', verifyToken, (req, res) => {
  try {
    const invoice = invoices.find(inv => 
      inv.id === req.params.id && inv.userId === req.user.id
    );
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json({
      success: true,
      invoice
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create a new invoice
router.post('/', verifyToken, (req, res) => {
  try {
    const {
      invoiceNumber,
      date,
      dueDate,
      clientInfo,
      businessInfo,
      items = [],
      subtotal = 0,
      tax = 0,
      total = 0,
      notes = '',
      status = 'draft'
    } = req.body;

    // Validate required fields
    if (!invoiceNumber || !date || !clientInfo) {
      return res.status(400).json({ 
        error: 'Missing required fields: invoiceNumber, date, clientInfo' 
      });
    }

    // Check if invoice number already exists for this user
    const existingInvoice = invoices.find(inv => 
      inv.invoiceNumber === invoiceNumber && inv.userId === req.user.id
    );
    
    if (existingInvoice) {
      return res.status(400).json({ 
        error: 'Invoice number already exists' 
      });
    }

    // Create new invoice
    const invoice = {
      id: uuidv4(),
      userId: req.user.id,
      invoiceNumber,
      date,
      dueDate,
      clientInfo: {
        name: clientInfo.name || '',
        email: clientInfo.email || '',
        address: clientInfo.address || '',
        phone: clientInfo.phone || ''
      },
      businessInfo: {
        name: businessInfo?.name || req.user.name || '',
        email: businessInfo?.email || req.user.email || '',
        address: businessInfo?.address || '',
        phone: businessInfo?.phone || ''
      },
      items: items.map(item => ({
        id: item.id || uuidv4(),
        description: item.description || '',
        quantity: parseFloat(item.quantity) || 0,
        rate: parseFloat(item.rate) || 0,
        amount: parseFloat(item.amount) || (parseFloat(item.quantity) * parseFloat(item.rate))
      })),
      subtotal: parseFloat(subtotal),
      tax: parseFloat(tax),
      total: parseFloat(total),
      notes,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    invoices.push(invoice);

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice
    });

  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ 
      error: 'Failed to create invoice',
      details: error.message 
    });
  }
});

// Update an existing invoice
router.put('/:id', verifyToken, (req, res) => {
  try {
    const invoiceIndex = invoices.findIndex(inv => 
      inv.id === req.params.id && inv.userId === req.user.id
    );
    
    if (invoiceIndex === -1) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const {
      invoiceNumber,
      date,
      dueDate,
      clientInfo,
      businessInfo,
      items = [],
      subtotal = 0,
      tax = 0,
      total = 0,
      notes = '',
      status
    } = req.body;

    // Check if invoice number is being changed and already exists
    if (invoiceNumber && invoiceNumber !== invoices[invoiceIndex].invoiceNumber) {
      const existingInvoice = invoices.find(inv => 
        inv.invoiceNumber === invoiceNumber && 
        inv.userId === req.user.id &&
        inv.id !== req.params.id
      );
      
      if (existingInvoice) {
        return res.status(400).json({ 
          error: 'Invoice number already exists' 
        });
      }
    }

    // Update invoice
    const updatedInvoice = {
      ...invoices[invoiceIndex],
      ...(invoiceNumber && { invoiceNumber }),
      ...(date && { date }),
      ...(dueDate && { dueDate }),
      ...(clientInfo && { 
        clientInfo: {
          name: clientInfo.name || invoices[invoiceIndex].clientInfo.name,
          email: clientInfo.email || invoices[invoiceIndex].clientInfo.email,
          address: clientInfo.address || invoices[invoiceIndex].clientInfo.address,
          phone: clientInfo.phone || invoices[invoiceIndex].clientInfo.phone
        }
      }),
      ...(businessInfo && { 
        businessInfo: {
          name: businessInfo.name || invoices[invoiceIndex].businessInfo.name,
          email: businessInfo.email || invoices[invoiceIndex].businessInfo.email,
          address: businessInfo.address || invoices[invoiceIndex].businessInfo.address,
          phone: businessInfo.phone || invoices[invoiceIndex].businessInfo.phone
        }
      }),
      items: items.map(item => ({
        id: item.id || uuidv4(),
        description: item.description || '',
        quantity: parseFloat(item.quantity) || 0,
        rate: parseFloat(item.rate) || 0,
        amount: parseFloat(item.amount) || (parseFloat(item.quantity) * parseFloat(item.rate))
      })),
      subtotal: parseFloat(subtotal),
      tax: parseFloat(tax),
      total: parseFloat(total),
      notes,
      ...(status && { status }),
      updatedAt: new Date().toISOString()
    };

    invoices[invoiceIndex] = updatedInvoice;

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      invoice: updatedInvoice
    });

  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ 
      error: 'Failed to update invoice',
      details: error.message 
    });
  }
});

// Delete an invoice
router.delete('/:id', verifyToken, (req, res) => {
  try {
    const invoiceIndex = invoices.findIndex(inv => 
      inv.id === req.params.id && inv.userId === req.user.id
    );
    
    if (invoiceIndex === -1) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const deletedInvoice = invoices.splice(invoiceIndex, 1)[0];

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
      invoice: deletedInvoice
    });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ 
      error: 'Failed to delete invoice',
      details: error.message 
    });
  }
});

// Update invoice status
router.patch('/:id/status', verifyToken, (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: draft, sent, paid, overdue, cancelled' 
      });
    }

    const invoiceIndex = invoices.findIndex(inv => 
      inv.id === req.params.id && inv.userId === req.user.id
    );
    
    if (invoiceIndex === -1) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    invoices[invoiceIndex].status = status;
    invoices[invoiceIndex].updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Invoice status updated successfully',
      invoice: invoices[invoiceIndex]
    });

  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ 
      error: 'Failed to update invoice status',
      details: error.message 
    });
  }
});

// Get invoice statistics
router.get('/stats/summary', verifyToken, (req, res) => {
  try {
    const userInvoices = invoices.filter(invoice => invoice.userId === req.user.id);
    
    const stats = {
      total: userInvoices.length,
      draft: userInvoices.filter(inv => inv.status === 'draft').length,
      sent: userInvoices.filter(inv => inv.status === 'sent').length,
      paid: userInvoices.filter(inv => inv.status === 'paid').length,
      overdue: userInvoices.filter(inv => inv.status === 'overdue').length,
      cancelled: userInvoices.filter(inv => inv.status === 'cancelled').length,
      totalAmount: userInvoices.reduce((sum, inv) => sum + inv.total, 0),
      paidAmount: userInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0),
      pendingAmount: userInvoices
        .filter(inv => ['sent', 'overdue'].includes(inv.status))
        .reduce((sum, inv) => sum + inv.total, 0)
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ error: 'Failed to fetch invoice statistics' });
  }
});

module.exports = router;
