<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Simple email service using PHP mail() function with SMTP
// This is a fallback when PHPMailer is not available

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Get form data
    $fromEmail = $_POST['fromEmail'] ?? '';
    $toEmail = $_POST['toEmail'] ?? '';
    $subject = $_POST['subject'] ?? '';
    $message = $_POST['message'] ?? '';
    
    // Validate required fields
    if (empty($fromEmail) || empty($toEmail) || empty($subject) || empty($message)) {
        throw new Exception('All fields are required');
    }
    
    // Validate email addresses
    if (!filter_var($fromEmail, FILTER_VALIDATE_EMAIL) || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email address');
    }
    
    // Prepare headers
    $headers = array();
    $headers[] = "MIME-Version: 1.0";
    $headers[] = "Content-type: text/html; charset=UTF-8";
    $headers[] = "From: Invoice Automation <{$fromEmail}>";
    $headers[] = "Reply-To: {$fromEmail}";
    $headers[] = "X-Mailer: PHP/" . phpversion();
    
    // Format message
    $htmlMessage = nl2br(htmlspecialchars($message));
    $emailBody = "
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
                <p>For any questions, please contact: {$fromEmail}</p>
            </div>
        </div>
    </body>
    </html>";
    
    // Handle file attachment (Base64 encoded in email body for simple implementation)
    $attachmentNote = '';
    if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
        $attachmentNote = "\n\nNote: PDF attachment was generated but cannot be sent with this simplified email service. Please use the full Gmail SMTP integration with PHPMailer for file attachments.";
    }
    
    if (!empty($attachmentNote)) {
        $emailBody = str_replace('</div></div>', $attachmentNote . '</div></div>', $emailBody);
    }
    
    // Send email
    $success = mail($toEmail, $subject, $emailBody, implode("\r\n", $headers));
    
    if ($success) {
        echo json_encode([
            'success' => true,
            'message' => 'Email sent successfully (using basic mail service)',
            'note' => $attachmentNote ? 'PDF attachment could not be sent. Please use Gmail SMTP integration for full functionality.' : ''
        ]);
    } else {
        throw new Exception('Failed to send email. Please check server mail configuration.');
    }
    
} catch (Exception $e) {
    error_log("Simple email sending error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'help' => [
            'suggestion' => 'This basic email service requires server mail configuration. For full Gmail integration with attachments, please install PHPMailer using the setup guide.',
            'setup_guide' => 'See EMAIL_SETUP_GUIDE.md for complete installation instructions'
        ]
    ]);
}
?>
