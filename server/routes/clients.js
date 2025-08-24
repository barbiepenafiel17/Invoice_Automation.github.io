const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('./auth');
const router = express.Router();

// In-memory storage for clients (replace with database in production)
let clients = [];

// Get all clients for the authenticated user
router.get('/', verifyToken, (req, res) => {
  try {
    const userClients = clients.filter(client => client.userId === req.user.id);
    res.json({
      success: true,
      clients: userClients,
      count: userClients.length
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get a specific client by ID
router.get('/:id', verifyToken, (req, res) => {
  try {
    const client = clients.find(cl => 
      cl.id === req.params.id && cl.userId === req.user.id
    );
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json({
      success: true,
      client
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Create a new client
router.post('/', verifyToken, (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      company,
      notes = ''
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email' 
      });
    }

    // Check if client with same email already exists for this user
    const existingClient = clients.find(cl => 
      cl.email === email && cl.userId === req.user.id
    );
    
    if (existingClient) {
      return res.status(400).json({ 
        error: 'Client with this email already exists' 
      });
    }

    // Create new client
    const client = {
      id: uuidv4(),
      userId: req.user.id,
      name,
      email,
      phone: phone || '',
      address: address || '',
      company: company || '',
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    clients.push(client);

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      client
    });

  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ 
      error: 'Failed to create client',
      details: error.message 
    });
  }
});

// Update an existing client
router.put('/:id', verifyToken, (req, res) => {
  try {
    const clientIndex = clients.findIndex(cl => 
      cl.id === req.params.id && cl.userId === req.user.id
    );
    
    if (clientIndex === -1) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const {
      name,
      email,
      phone,
      address,
      company,
      notes
    } = req.body;

    // Check if email is being changed and already exists
    if (email && email !== clients[clientIndex].email) {
      const existingClient = clients.find(cl => 
        cl.email === email && 
        cl.userId === req.user.id &&
        cl.id !== req.params.id
      );
      
      if (existingClient) {
        return res.status(400).json({ 
          error: 'Client with this email already exists' 
        });
      }
    }

    // Update client
    const updatedClient = {
      ...clients[clientIndex],
      ...(name && { name }),
      ...(email && { email }),
      phone: phone !== undefined ? phone : clients[clientIndex].phone,
      address: address !== undefined ? address : clients[clientIndex].address,
      company: company !== undefined ? company : clients[clientIndex].company,
      notes: notes !== undefined ? notes : clients[clientIndex].notes,
      updatedAt: new Date().toISOString()
    };

    clients[clientIndex] = updatedClient;

    res.json({
      success: true,
      message: 'Client updated successfully',
      client: updatedClient
    });

  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ 
      error: 'Failed to update client',
      details: error.message 
    });
  }
});

// Delete a client
router.delete('/:id', verifyToken, (req, res) => {
  try {
    const clientIndex = clients.findIndex(cl => 
      cl.id === req.params.id && cl.userId === req.user.id
    );
    
    if (clientIndex === -1) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const deletedClient = clients.splice(clientIndex, 1)[0];

    res.json({
      success: true,
      message: 'Client deleted successfully',
      client: deletedClient
    });

  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ 
      error: 'Failed to delete client',
      details: error.message 
    });
  }
});

// Search clients
router.get('/search/:query', verifyToken, (req, res) => {
  try {
    const query = req.params.query.toLowerCase();
    const userClients = clients.filter(client => client.userId === req.user.id);
    
    const filteredClients = userClients.filter(client => 
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.company.toLowerCase().includes(query) ||
      client.phone.includes(query)
    );

    res.json({
      success: true,
      clients: filteredClients,
      count: filteredClients.length,
      query
    });

  } catch (error) {
    console.error('Error searching clients:', error);
    res.status(500).json({ error: 'Failed to search clients' });
  }
});

// Get client statistics
router.get('/stats/summary', verifyToken, (req, res) => {
  try {
    const userClients = clients.filter(client => client.userId === req.user.id);
    
    // Get invoices for statistics (assuming invoices are available globally)
    const userInvoices = global.invoices ? 
      global.invoices.filter(inv => inv.userId === req.user.id) : [];
    
    const stats = {
      totalClients: userClients.length,
      recentClients: userClients
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
      clientsWithInvoices: userClients.filter(client => 
        userInvoices.some(inv => inv.clientInfo.email === client.email)
      ).length
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching client stats:', error);
    res.status(500).json({ error: 'Failed to fetch client statistics' });
  }
});

// Import clients from CSV (basic implementation)
router.post('/import', verifyToken, (req, res) => {
  try {
    const { clients: importClients } = req.body;
    
    if (!Array.isArray(importClients)) {
      return res.status(400).json({ 
        error: 'Invalid data format. Expected array of clients.' 
      });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    importClients.forEach((clientData, index) => {
      try {
        const { name, email, phone, address, company } = clientData;
        
        if (!name || !email) {
          results.errors.push(`Row ${index + 1}: Missing name or email`);
          results.skipped++;
          return;
        }

        // Check if client already exists
        const existingClient = clients.find(cl => 
          cl.email === email && cl.userId === req.user.id
        );
        
        if (existingClient) {
          results.skipped++;
          return;
        }

        // Create client
        const client = {
          id: uuidv4(),
          userId: req.user.id,
          name,
          email,
          phone: phone || '',
          address: address || '',
          company: company || '',
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        clients.push(client);
        results.imported++;

      } catch (error) {
        results.errors.push(`Row ${index + 1}: ${error.message}`);
        results.skipped++;
      }
    });

    res.json({
      success: true,
      message: 'Import completed',
      results
    });

  } catch (error) {
    console.error('Error importing clients:', error);
    res.status(500).json({ 
      error: 'Failed to import clients',
      details: error.message 
    });
  }
});

module.exports = router;
