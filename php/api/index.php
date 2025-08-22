<?php
/**
 * Database API for Invoice Automation
 * Provides RESTful endpoints for database operations
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';

class DatabaseAPI {
    private $db;
    private $connection;
    
    public function __construct() {
        $this->db = new Database();
        try {
            $this->connection = $this->db->getConnection();
        } catch (Exception $e) {
            $this->sendError('Database connection failed', 500);
        }
    }
    
    /**
     * Handle API requests
     */
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = $_GET['path'] ?? '';
        $pathParts = explode('/', trim($path, '/'));
        
        $resource = $pathParts[0] ?? '';
        $id = $pathParts[1] ?? null;
        
        try {
            switch ($resource) {
                case 'test':
                    $this->testConnection();
                    break;
                case 'setup':
                    $this->setupDatabase();
                    break;
                case 'clients':
                    $this->handleClients($method, $id);
                    break;
                case 'invoices':
                    $this->handleInvoices($method, $id);
                    break;
                case 'settings':
                    $this->handleSettings($method, $id);
                    break;
                case 'migrate':
                    $this->migrateFromLocalStorage();
                    break;
                case 'stats':
                    $this->getStats();
                    break;
                default:
                    $this->sendError('Invalid endpoint', 404);
            }
        } catch (Exception $e) {
            $this->sendError($e->getMessage(), 500);
        }
    }
    
    /**
     * Test database connection
     */
    private function testConnection() {
        $result = $this->db->testConnection();
        $this->sendResponse($result);
    }
    
    /**
     * Setup database (create tables)
     */
    private function setupDatabase() {
        try {
            // First create database
            $createResult = $this->db->createDatabase();
            if (!$createResult['success']) {
                $this->sendError($createResult['message'], 500);
                return;
            }
            
            // Read and execute schema
            $schemaPath = __DIR__ . '/../../database/schema.sql';
            if (!file_exists($schemaPath)) {
                $this->sendError('Schema file not found', 500);
                return;
            }
            
            $sql = file_get_contents($schemaPath);
            
            // Split into individual statements
            $statements = array_filter(array_map('trim', explode(';', $sql)));
            
            foreach ($statements as $statement) {
                if (!empty($statement) && !preg_match('/^(--|SET|START|COMMIT)/', $statement)) {
                    $this->connection->exec($statement);
                }
            }
            
            $this->sendResponse([
                'success' => true,
                'message' => 'Database setup completed successfully'
            ]);
            
        } catch (Exception $e) {
            $this->sendError('Database setup failed: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Handle client operations
     */
    private function handleClients($method, $id) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $this->getClient($id);
                } else {
                    $this->getClients();
                }
                break;
            case 'POST':
                $this->createClient();
                break;
            case 'PUT':
                if (!$id) {
                    $this->sendError('Client ID required for update', 400);
                }
                $this->updateClient($id);
                break;
            case 'DELETE':
                if (!$id) {
                    $this->sendError('Client ID required for delete', 400);
                }
                $this->deleteClient($id);
                break;
            default:
                $this->sendError('Method not allowed', 405);
        }
    }
    
    /**
     * Get all clients
     */
    private function getClients() {
        $query = "SELECT * FROM clients ORDER BY created_at DESC";
        $stmt = $this->connection->prepare($query);
        $stmt->execute();
        $clients = $stmt->fetchAll();
        
        $this->sendResponse(['clients' => $clients]);
    }
    
    /**
     * Get single client
     */
    private function getClient($id) {
        $query = "SELECT * FROM clients WHERE id = ?";
        $stmt = $this->connection->prepare($query);
        $stmt->execute([$id]);
        $client = $stmt->fetch();
        
        if (!$client) {
            $this->sendError('Client not found', 404);
        }
        
        $this->sendResponse(['client' => $client]);
    }
    
    /**
     * Create new client
     */
    private function createClient() {
        $input = $this->getInput();
        
        $clientId = 'c_' . time() . '_' . uniqid();
        
        $query = "INSERT INTO clients (id, name, company, email, phone, address, city, state, postal_code, country, tax_id) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->connection->prepare($query);
        $success = $stmt->execute([
            $clientId,
            $input['name'] ?? '',
            $input['company'] ?? null,
            $input['email'] ?? '',
            $input['phone'] ?? null,
            $input['address'] ?? null,
            $input['city'] ?? null,
            $input['state'] ?? null,
            $input['postal_code'] ?? null,
            $input['country'] ?? 'Philippines',
            $input['tax_id'] ?? null
        ]);
        
        if ($success) {
            $this->getClient($clientId);
        } else {
            $this->sendError('Failed to create client', 500);
        }
    }
    
    /**
     * Update client
     */
    private function updateClient($id) {
        $input = $this->getInput();
        
        $query = "UPDATE clients SET 
                  name = ?, company = ?, email = ?, phone = ?, 
                  address = ?, city = ?, state = ?, postal_code = ?, 
                  country = ?, tax_id = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?";
        
        $stmt = $this->connection->prepare($query);
        $success = $stmt->execute([
            $input['name'] ?? '',
            $input['company'] ?? null,
            $input['email'] ?? '',
            $input['phone'] ?? null,
            $input['address'] ?? null,
            $input['city'] ?? null,
            $input['state'] ?? null,
            $input['postal_code'] ?? null,
            $input['country'] ?? 'Philippines',
            $input['tax_id'] ?? null,
            $id
        ]);
        
        if ($success && $stmt->rowCount() > 0) {
            $this->getClient($id);
        } else {
            $this->sendError('Client not found or no changes made', 404);
        }
    }
    
    /**
     * Delete client
     */
    private function deleteClient($id) {
        $query = "DELETE FROM clients WHERE id = ?";
        $stmt = $this->connection->prepare($query);
        $success = $stmt->execute([$id]);
        
        if ($success && $stmt->rowCount() > 0) {
            $this->sendResponse(['success' => true, 'message' => 'Client deleted successfully']);
        } else {
            $this->sendError('Client not found', 404);
        }
    }
    
    /**
     * Handle invoice operations
     */
    private function handleInvoices($method, $id) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $this->getInvoice($id);
                } else {
                    $this->getInvoices();
                }
                break;
            case 'POST':
                $this->createInvoice();
                break;
            case 'PUT':
                if (!$id) {
                    $this->sendError('Invoice ID required for update', 400);
                }
                $this->updateInvoice($id);
                break;
            case 'DELETE':
                if (!$id) {
                    $this->sendError('Invoice ID required for delete', 400);
                }
                $this->deleteInvoice($id);
                break;
            default:
                $this->sendError('Method not allowed', 405);
        }
    }
    
    /**
     * Get all invoices with client info
     */
    private function getInvoices() {
        $query = "SELECT i.*, c.name as client_name, c.company as client_company, c.email as client_email
                  FROM invoices i
                  LEFT JOIN clients c ON i.client_id = c.id
                  ORDER BY i.created_at DESC";
        
        $stmt = $this->connection->prepare($query);
        $stmt->execute();
        $invoices = $stmt->fetchAll();
        
        // Get items for each invoice
        foreach ($invoices as &$invoice) {
            $invoice['items'] = $this->getInvoiceItems($invoice['id']);
        }
        
        $this->sendResponse(['invoices' => $invoices]);
    }
    
    /**
     * Get invoice items
     */
    private function getInvoiceItems($invoiceId) {
        $query = "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id";
        $stmt = $this->connection->prepare($query);
        $stmt->execute([$invoiceId]);
        return $stmt->fetchAll();
    }
    
    /**
     * Get single invoice
     */
    private function getInvoice($id) {
        $query = "SELECT i.*, c.name as client_name, c.company as client_company, c.email as client_email
                  FROM invoices i
                  LEFT JOIN clients c ON i.client_id = c.id
                  WHERE i.id = ?";
        $stmt = $this->connection->prepare($query);
        $stmt->execute([$id]);
        $invoice = $stmt->fetch();
        
        if (!$invoice) {
            $this->sendError('Invoice not found', 404);
        }
        
        $invoice['items'] = $this->getInvoiceItems($id);
        $this->sendResponse(['invoice' => $invoice]);
    }
    
    /**
     * Create new invoice
     */
    private function createInvoice() {
        $input = $this->getInput();
        
        // Generate invoice ID
        $settings = $this->getSettingsArray();
        $invoiceId = $this->generateInvoiceId($settings);
        
        try {
            $this->connection->beginTransaction();
            
            // Insert invoice
            $query = "INSERT INTO invoices (id, client_id, issue_date, due_date, terms, status, 
                      subtotal, tax_rate, tax_amount, discount, total_amount, notes, currency) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->connection->prepare($query);
            $success = $stmt->execute([
                $invoiceId,
                $input['clientId'] ?? '',
                $input['issueDate'] ?? date('Y-m-d'),
                $input['dueDate'] ?? date('Y-m-d', strtotime('+30 days')),
                $input['terms'] ?? 'Net 30',
                $input['status'] ?? 'unpaid',
                $input['totals']['subtotal'] ?? 0,
                $input['taxRate'] ?? 0,
                $input['totals']['tax'] ?? 0,
                $input['discount'] ?? 0,
                $input['totals']['grand'] ?? 0,
                $input['notes'] ?? '',
                $input['currency'] ?? 'PHP'
            ]);
            
            if (!$success) {
                throw new Exception('Failed to create invoice');
            }
            
            // Insert invoice items
            if (isset($input['items']) && is_array($input['items'])) {
                foreach ($input['items'] as $item) {
                    $this->insertInvoiceItem($invoiceId, $item);
                }
            }
            
            // Update number seed
            $this->updateSetting('number_seed', ((int)$settings['number_seed']) + 1);
            
            $this->connection->commit();
            $this->getInvoice($invoiceId);
            
        } catch (Exception $e) {
            $this->connection->rollback();
            $this->sendError('Failed to create invoice: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Update invoice
     */
    private function updateInvoice($id) {
        $input = $this->getInput();
        
        try {
            $this->connection->beginTransaction();
            
            // Update invoice
            $query = "UPDATE invoices SET 
                      client_id = ?, issue_date = ?, due_date = ?, terms = ?, status = ?,
                      subtotal = ?, tax_rate = ?, tax_amount = ?, discount = ?, total_amount = ?,
                      notes = ?, currency = ?, updated_at = CURRENT_TIMESTAMP
                      WHERE id = ?";
            
            $stmt = $this->connection->prepare($query);
            $success = $stmt->execute([
                $input['clientId'] ?? '',
                $input['issueDate'] ?? date('Y-m-d'),
                $input['dueDate'] ?? date('Y-m-d', strtotime('+30 days')),
                $input['terms'] ?? 'Net 30',
                $input['status'] ?? 'unpaid',
                $input['totals']['subtotal'] ?? 0,
                $input['taxRate'] ?? 0,
                $input['totals']['tax'] ?? 0,
                $input['discount'] ?? 0,
                $input['totals']['grand'] ?? 0,
                $input['notes'] ?? '',
                $input['currency'] ?? 'PHP',
                $id
            ]);
            
            if (!$success || $stmt->rowCount() === 0) {
                throw new Exception('Invoice not found or no changes made');
            }
            
            // Delete existing items and insert new ones
            $query = "DELETE FROM invoice_items WHERE invoice_id = ?";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);
            
            // Insert updated items
            if (isset($input['items']) && is_array($input['items'])) {
                foreach ($input['items'] as $item) {
                    $this->insertInvoiceItem($id, $item);
                }
            }
            
            $this->connection->commit();
            $this->getInvoice($id);
            
        } catch (Exception $e) {
            $this->connection->rollback();
            $this->sendError('Failed to update invoice: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Delete invoice
     */
    private function deleteInvoice($id) {
        $query = "DELETE FROM invoices WHERE id = ?";
        $stmt = $this->connection->prepare($query);
        $success = $stmt->execute([$id]);
        
        if ($success && $stmt->rowCount() > 0) {
            $this->sendResponse(['success' => true, 'message' => 'Invoice deleted successfully']);
        } else {
            $this->sendError('Invoice not found', 404);
        }
    }
    
    /**
     * Insert invoice item
     */
    private function insertInvoiceItem($invoiceId, $item) {
        $query = "INSERT INTO invoice_items (invoice_id, description, quantity, rate, tax_rate, amount) 
                  VALUES (?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->connection->prepare($query);
        $stmt->execute([
            $invoiceId,
            $item['description'] ?? '',
            $item['quantity'] ?? 1,
            $item['rate'] ?? 0,
            $item['taxRate'] ?? 0,
            $item['amount'] ?? 0
        ]);
    }
    
    /**
     * Generate invoice ID
     */
    private function generateInvoiceId($settings) {
        $prefix = $settings['invoice_prefix'] ?? 'INV';
        $seed = (int)($settings['number_seed'] ?? 1);
        $date = new DateTime();
        $yearMonth = $date->format('Ym');
        $counter = str_pad($seed, 3, '0', STR_PAD_LEFT);
        
        return "{$prefix}-{$yearMonth}-{$counter}";
    }
    
    /**
     * Get settings as array
     */
    private function getSettingsArray() {
        $query = "SELECT setting_key, setting_value FROM settings";
        $stmt = $this->connection->prepare($query);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        
        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        
        return $settings;
    }
    
    /**
     * Update single setting
     */
    private function updateSetting($key, $value) {
        $query = "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) 
                  ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = CURRENT_TIMESTAMP";
        $stmt = $this->connection->prepare($query);
        $stmt->execute([$key, $value, $value]);
    }
    
    /**
     * Handle settings operations
     */
    private function handleSettings($method, $key = null) {
        switch ($method) {
            case 'GET':
                $this->getSettings();
                break;
            case 'POST':
            case 'PUT':
                $this->updateSettings();
                break;
            default:
                $this->sendError('Method not allowed', 405);
        }
    }
    
    /**
     * Get all settings
     */
    private function getSettings() {
        $query = "SELECT setting_key, setting_value FROM settings";
        $stmt = $this->connection->prepare($query);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        
        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        
        $this->sendResponse(['settings' => $settings]);
    }
    
    /**
     * Update settings
     */
    private function updateSettings() {
        $input = $this->getInput();
        
        foreach ($input as $key => $value) {
            $query = "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) 
                      ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = CURRENT_TIMESTAMP";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$key, $value, $value]);
        }
        
        $this->getSettings();
    }
    
    /**
     * Migrate data from localStorage format
     */
    private function migrateFromLocalStorage() {
        $input = $this->getInput();
        
        if (!isset($input['data'])) {
            $this->sendError('Migration data required', 400);
        }
        
        $data = $input['data'];
        $migrated = ['clients' => 0, 'invoices' => 0, 'settings' => 0];
        
        try {
            $this->connection->beginTransaction();
            
            // Migrate clients
            if (isset($data['clients'])) {
                foreach ($data['clients'] as $client) {
                    $this->migrateClient($client);
                    $migrated['clients']++;
                }
            }
            
            // Migrate invoices
            if (isset($data['invoices'])) {
                foreach ($data['invoices'] as $invoice) {
                    $this->migrateInvoice($invoice);
                    $migrated['invoices']++;
                }
            }
            
            // Migrate settings
            if (isset($data['settings'])) {
                foreach ($data['settings'] as $key => $value) {
                    $query = "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) 
                              ON DUPLICATE KEY UPDATE setting_value = ?";
                    $stmt = $this->connection->prepare($query);
                    $stmt->execute([$key, $value, $value]);
                }
                $migrated['settings'] = count($data['settings']);
            }
            
            $this->connection->commit();
            
            $this->sendResponse([
                'success' => true,
                'message' => 'Migration completed successfully',
                'migrated' => $migrated
            ]);
            
        } catch (Exception $e) {
            $this->connection->rollback();
            $this->sendError('Migration failed: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Migrate single client
     */
    private function migrateClient($client) {
        $query = "INSERT INTO clients (id, name, company, email, phone, address, city, state, postal_code, country, tax_id, created_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))
                  ON DUPLICATE KEY UPDATE 
                  name = VALUES(name), company = VALUES(company), email = VALUES(email)";
        
        $stmt = $this->connection->prepare($query);
        $stmt->execute([
            $client['id'],
            $client['name'] ?? '',
            $client['company'] ?? null,
            $client['email'] ?? '',
            $client['phone'] ?? null,
            $client['address'] ?? null,
            $client['city'] ?? null,
            $client['state'] ?? null,
            $client['postalCode'] ?? null,
            $client['country'] ?? 'Philippines',
            $client['taxId'] ?? null,
            isset($client['createdAt']) ? $client['createdAt'] / 1000 : time()
        ]);
    }
    
    /**
     * Migrate single invoice
     */
    private function migrateInvoice($invoice) {
        // Insert invoice
        $query = "INSERT INTO invoices (id, client_id, issue_date, due_date, terms, status, 
                  subtotal, tax_rate, tax_amount, discount, total_amount, notes, currency, created_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))
                  ON DUPLICATE KEY UPDATE 
                  status = VALUES(status), total_amount = VALUES(total_amount)";
        
        $stmt = $this->connection->prepare($query);
        $stmt->execute([
            $invoice['id'],
            $invoice['clientId'],
            $invoice['issueDate'],
            $invoice['dueDate'],
            $invoice['terms'] ?? 'Net 30',
            $invoice['status'] ?? 'unpaid',
            $invoice['totals']['subtotal'] ?? 0,
            $invoice['taxRate'] ?? 0,
            $invoice['totals']['tax'] ?? 0,
            $invoice['discount'] ?? 0,
            $invoice['totals']['grand'] ?? 0,
            $invoice['notes'] ?? '',
            $invoice['currency'] ?? 'PHP',
            isset($invoice['createdAt']) ? $invoice['createdAt'] / 1000 : time()
        ]);
        
        // Insert invoice items
        if (isset($invoice['items'])) {
            foreach ($invoice['items'] as $item) {
                $this->migrateInvoiceItem($invoice['id'], $item);
            }
        }
    }
    
    /**
     * Migrate single invoice item
     */
    private function migrateInvoiceItem($invoiceId, $item) {
        $query = "INSERT INTO invoice_items (invoice_id, description, quantity, rate, tax_rate, amount) 
                  VALUES (?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->connection->prepare($query);
        $stmt->execute([
            $invoiceId,
            $item['description'] ?? '',
            $item['quantity'] ?? 1,
            $item['rate'] ?? 0,
            $item['taxRate'] ?? 0,
            $item['amount'] ?? 0
        ]);
    }
    
    /**
     * Get application statistics
     */
    private function getStats() {
        $stats = [];
        
        // Invoice counts by status
        $query = "SELECT status, COUNT(*) as count FROM invoices GROUP BY status";
        $stmt = $this->connection->prepare($query);
        $stmt->execute();
        $statusCounts = $stmt->fetchAll();
        
        $stats['invoices_by_status'] = [];
        foreach ($statusCounts as $row) {
            $stats['invoices_by_status'][$row['status']] = (int)$row['count'];
        }
        
        // Total clients
        $query = "SELECT COUNT(*) as count FROM clients";
        $stmt = $this->connection->prepare($query);
        $stmt->execute();
        $stats['total_clients'] = (int)$stmt->fetchColumn();
        
        // Total invoices
        $query = "SELECT COUNT(*) as count FROM invoices";
        $stmt = $this->connection->prepare($query);
        $stmt->execute();
        $stats['total_invoices'] = (int)$stmt->fetchColumn();
        
        // Revenue this month
        $query = "SELECT SUM(total_amount) as revenue FROM invoices 
                  WHERE status = 'paid' AND MONTH(updated_at) = MONTH(CURRENT_DATE()) 
                  AND YEAR(updated_at) = YEAR(CURRENT_DATE())";
        $stmt = $this->connection->prepare($query);
        $stmt->execute();
        $stats['revenue_this_month'] = (float)$stmt->fetchColumn();
        
        $this->sendResponse(['stats' => $stats]);
    }
    
    /**
     * Get JSON input
     */
    private function getInput() {
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->sendError('Invalid JSON input', 400);
        }
        return $input ?? [];
    }
    
    /**
     * Send JSON response
     */
    private function sendResponse($data, $code = 200) {
        http_response_code($code);
        echo json_encode($data);
        exit();
    }
    
    /**
     * Send error response
     */
    private function sendError($message, $code = 400) {
        http_response_code($code);
        echo json_encode(['error' => $message]);
        exit();
    }
}

// Initialize and handle request
$api = new DatabaseAPI();
$api->handleRequest();
