<?php
/**
 * Database Configuration for Invoice Automation
 * MySQL/MariaDB connection settings
 */

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $charset;
    public $connection;
    
    public function __construct() {
        $this->host = 'localhost';
        $this->db_name = 'invoice_automation';
        $this->username = 'root';
        $this->password = '';
        $this->charset = 'utf8mb4';
    }
    
    /**
     * Get database connection
     */
    public function getConnection() {
        $this->connection = null;
        
        try {
            $dsn = "mysql:host={$this->host};dbname={$this->db_name};charset={$this->charset}";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            
            $this->connection = new PDO($dsn, $this->username, $this->password, $options);
            
        } catch(PDOException $exception) {
            error_log("Database connection error: " . $exception->getMessage());
            throw new Exception("Database connection failed");
        }
        
        return $this->connection;
    }
    
    /**
     * Test database connection
     */
    public function testConnection() {
        try {
            $connection = $this->getConnection();
            if ($connection) {
                return [
                    'success' => true,
                    'message' => 'Database connection successful',
                    'server_info' => $connection->getAttribute(PDO::ATTR_SERVER_VERSION)
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Database connection failed: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Create database if not exists
     */
    public function createDatabase() {
        try {
            // Connect without database name first
            $dsn = "mysql:host={$this->host};charset={$this->charset}";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            
            $connection = new PDO($dsn, $this->username, $this->password, $options);
            
            // Create database
            $sql = "CREATE DATABASE IF NOT EXISTS `{$this->db_name}` 
                    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
            $connection->exec($sql);
            
            return [
                'success' => true,
                'message' => "Database '{$this->db_name}' created successfully"
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Database creation failed: ' . $e->getMessage()
            ];
        }
    }
}
