<?php
/**
 * Database Setup Script for Invoice Automation
 * Run this script to create the database and tables
 */

require_once __DIR__ . '/../php/config/database.php';

echo "=== Invoice Automation Database Setup ===\n";

try {
    $db = new Database();
    
    // Test initial connection (without specific database)
    echo "1. Testing MySQL connection...\n";
    $testResult = $db->testConnection();
    
    if (!$testResult['success']) {
        echo "   Creating database...\n";
        $createResult = $db->createDatabase();
        
        if (!$createResult['success']) {
            throw new Exception($createResult['message']);
        }
        
        echo "   ✅ Database created successfully\n";
    } else {
        echo "   ✅ Database connection successful\n";
    }
    
    // Read and execute schema
    echo "2. Setting up database tables...\n";
    $schemaPath = __DIR__ . '/simple_schema.sql';
    
    if (!file_exists($schemaPath)) {
        throw new Exception('Schema file not found: ' . $schemaPath);
    }
    
    $sql = file_get_contents($schemaPath);
    
    // Get connection and execute schema
    $connection = $db->getConnection();
    
    // Execute the entire SQL file
    try {
        $connection->exec($sql);
        echo "   ✅ Database schema executed successfully\n";
    } catch (PDOException $e) {
        // Try executing statement by statement if bulk execution fails
        echo "   Executing statements individually...\n";
        
        $statements = array_filter(array_map('trim', explode(';', $sql)));
        $executed = 0;
        
        foreach ($statements as $statement) {
            // Skip comments, empty statements, and transaction commands
            if (empty($statement) || 
                strpos($statement, '--') === 0 || 
                strpos($statement, '/*') === 0 ||
                preg_match('/^(SET|START|COMMIT|USE)/i', $statement)) {
                continue;
            }
            
            try {
                $connection->exec($statement);
                $executed++;
            } catch (PDOException $e2) {
                // Ignore "already exists" errors and other non-critical errors
                if (strpos($e2->getMessage(), 'already exists') === false &&
                    strpos($e2->getMessage(), 'Duplicate key') === false) {
                    echo "   Warning: " . $e2->getMessage() . "\n";
                    echo "   Statement: " . substr($statement, 0, 100) . "...\n";
                }
            }
        }
        
        echo "   ✅ Executed $executed SQL statements\n";
    }
    
    echo "   ✅ Executed $executed SQL statements\n";
    
    // Verify tables were created
    echo "3. Verifying database structure...\n";
    $tables = ['clients', 'invoices', 'invoice_items', 'settings', 'email_logs'];
    
    foreach ($tables as $table) {
        $query = "SHOW TABLES LIKE '$table'";
        $stmt = $connection->prepare($query);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            echo "   ✅ Table '$table' exists\n";
        } else {
            echo "   ❌ Table '$table' missing\n";
        }
    }
    
    // Check if settings are populated
    $query = "SELECT COUNT(*) FROM settings";
    $stmt = $connection->prepare($query);
    $stmt->execute();
    $settingsCount = $stmt->fetchColumn();
    
    echo "   ✅ Settings table has $settingsCount entries\n";
    
    echo "\n=== Setup Complete! ===\n";
    echo "✅ Database: invoice_automation\n";
    echo "✅ Tables: " . implode(', ', $tables) . "\n";
    echo "✅ Ready to use!\n\n";
    echo "You can now access the database API at:\n";
    echo "http://localhost/Invoice_Automation/php/api/?path=test\n\n";
    
} catch (Exception $e) {
    echo "\n❌ Setup failed: " . $e->getMessage() . "\n";
    echo "Please check:\n";
    echo "- XAMPP is running\n";
    echo "- MySQL service is active\n";
    echo "- PHP has PDO extension enabled\n\n";
    exit(1);
}
?>
