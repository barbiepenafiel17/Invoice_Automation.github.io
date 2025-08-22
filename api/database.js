// Serverless function to handle database operations
// Note: This is a mock API for demonstration on Vercel (static hosting)
// For production database functionality, use a proper backend service

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { path } = req.query;
  
  try {
    // Mock database responses for demo
    switch (path) {
      case 'test':
        return res.json({
          success: false,
          message: 'Database connection not available on Vercel static hosting. Please use localhost with XAMPP for database features.'
        });
        
      case 'setup':
        return res.json({
          success: false,
          message: 'Database setup not available on static hosting. This feature works with local XAMPP installation.'
        });
        
      case 'clients':
        if (req.method === 'GET') {
          return res.json({
            clients: [],
            message: 'Database features are available in localhost mode with XAMPP'
          });
        }
        return res.json({
          success: false,
          message: 'Database operations require localhost with XAMPP'
        });
        
      case 'invoices':
        if (req.method === 'GET') {
          return res.json({
            invoices: [],
            message: 'Database features are available in localhost mode with XAMPP'
          });
        }
        return res.json({
          success: false,
          message: 'Database operations require localhost with XAMPP'
        });
        
      case 'settings':
        if (req.method === 'GET') {
          return res.json({
            settings: {
              invoice_prefix: 'INV',
              currency: 'PHP',
              number_seed: '1',
              company_name: 'Your Company'
            },
            message: 'Using default settings. Database features require localhost with XAMPP'
          });
        }
        return res.json({
          success: false,
          message: 'Database operations require localhost with XAMPP'
        });
        
      case 'migrate':
        return res.json({
          success: false,
          message: 'Data migration requires localhost database setup with XAMPP'
        });
        
      case 'stats':
        return res.json({
          stats: {
            total_clients: 0,
            total_invoices: 0,
            revenue_this_month: 0,
            invoices_by_status: {
              unpaid: 0,
              paid: 0,
              overdue: 0
            }
          },
          message: 'Database statistics require localhost with XAMPP'
        });
        
      default:
        return res.status(404).json({
          error: 'Endpoint not found',
          message: 'For full database functionality, use localhost with XAMPP'
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
}
