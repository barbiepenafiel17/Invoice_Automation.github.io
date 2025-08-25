<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Check if request is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Try to include Composer autoload
$autoloadPaths = [
    __DIR__ . '/vendor/autoload.php',
    __DIR__ . '/../vendor/autoload.php',
    __DIR__ . '/../../vendor/autoload.php'
];

$autoloadFound = false;
foreach ($autoloadPaths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $autoloadFound = true;
        break;
    }
}

// Check if PHPMailer is available
if (!$autoloadFound) {
    // Manual inclusion of PHPMailer if autoload failed
    $phpmailerPaths = [
        __DIR__ . '/PHPMailer/src/',
        __DIR__ . '/vendor/phpmailer/phpmailer/src/'
    ];
    
    foreach ($phpmailerPaths as $path) {
        if (file_exists($path . 'PHPMailer.php')) {
            require_once $path . 'PHPMailer.php';
            require_once $path . 'SMTP.php';
            require_once $path . 'Exception.php';
            break;
        }
    }
}

// Move use statements before class_exists check
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
    echo json_encode([
        'success' => false, 
        'error' => 'PHPMailer not found. Please install it using: composer require phpmailer/phpmailer',
        'installation_guide' => [
            'step1' => 'Open terminal in your project directory',
            'step2' => 'Run: composer require phpmailer/phpmailer',
            'step3' => 'Or download PHPMailer manually and include the files'
        ]
    ]);
    exit;
}

try {
    // Get form data
    $fromEmail = $_POST['fromEmail'] ?? '';
    $appPassword = $_POST['appPassword'] ?? '';
    $toEmail = $_POST['toEmail'] ?? '';
    $subject = $_POST['subject'] ?? '';
    $message = $_POST['message'] ?? '';
    
    // Validate required fields
    if (empty($fromEmail) || empty($appPassword) || empty($toEmail) || empty($subject) || empty($message)) {
        throw new \Exception('All fields are required');
    }
    
    // Validate email addresses
    if (!filter_var($fromEmail, FILTER_VALIDATE_EMAIL) || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email address');
    }
    
    // Create PHPMailer instance
    $mail = new PHPMailer(true);
    
    // Server settings
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = $fromEmail;
    $mail->Password = $appPassword;
    $mail->SMTPSecure = 'tls';  // Or use 'ssl' for port 465
    $mail->Port = 587;
    
    // Recipients
    $mail->setFrom($fromEmail, 'Invoice Automation');
    $mail->addAddress($toEmail);
    $mail->addReplyTo($fromEmail);
    
    // Content
    $mail->isHTML(true);
    $mail->Subject = $subject;
    
    // Format message with proper HTML
    $htmlMessage = nl2br(htmlspecialchars($message));
    $mail->Body = "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1f2937, #4b5563); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
        </style>
    </head>
    <body>
        <div class='email-container'>
            <div class='header'>
                <h2 style='margin: 0;'>Invoice Automation</h2>
            </div>
            <div class='content'>
                <div style='white-space: pre-line;'>{$htmlMessage}</div>
            </div>
            <div class='footer'>
                <p>This email was sent via Invoice Automation System</p>
                <p>Please do not reply directly to this email.</p>
            </div>
        </div>
    </body>
    </html>";
    
    $mail->AltBody = strip_tags($message);
    
    // Handle file attachment
    if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
        $uploadedFile = $_FILES['attachment'];
        $mail->addAttachment($uploadedFile['tmp_name'], $uploadedFile['name']);
    }
    
    // Send email
    $mail->send();
    
    echo json_encode([
        'success' => true,
        'message' => 'Email sent successfully'
    ]);
    
} catch (\Exception $e) {
    error_log("Email sending error: " . $e->getMessage());
    
    $errorMessage = $e->getMessage();
    
    // Provide helpful error messages
    if (strpos($errorMessage, 'Authentication failed') !== false) {
        $errorMessage = 'Gmail authentication failed. Please check your email and app password. Make sure 2-factor authentication is enabled and you\'re using an App Password (not your regular password).';
    } elseif (strpos($errorMessage, 'Could not connect') !== false) {
        $errorMessage = 'Could not connect to Gmail SMTP server. Please check your internet connection.';
    }
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $errorMessage,
        'help' => [
            'app_password_guide' => 'https://support.google.com/accounts/answer/185833',
            'troubleshooting' => 'Make sure 2-factor authentication is enabled on your Gmail account and use an App Password instead of your regular password.'
        ]
    ]);
}
?>
