const express = require('express');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('./auth');
const router = express.Router();

// Generate PDF from invoice data
router.post('/generate', verifyToken, async (req, res) => {
  try {
    const { invoiceData, pdfBuffer } = req.body;
    
    if (!invoiceData) {
      return res.status(400).json({ 
        error: 'Invoice data is required' 
      });
    }

    // If PDF buffer is provided (from frontend), just return success
    if (pdfBuffer) {
      res.json({
        success: true,
        message: 'PDF generated successfully',
        fileName: `invoice-${invoiceData.invoiceNumber || 'draft'}.pdf`,
        size: Buffer.from(pdfBuffer, 'base64').length
      });
      return;
    }

    // For server-side PDF generation (if needed in the future)
    // This would require additional libraries like puppeteer or pdf-lib
    res.json({
      success: true,
      message: 'PDF generation endpoint ready',
      note: 'Currently using client-side PDF generation'
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF',
      details: error.message 
    });
  }
});

// Save PDF to server (optional)
router.post('/save', verifyToken, async (req, res) => {
  try {
    const { pdfBuffer, fileName, invoiceId } = req.body;
    
    if (!pdfBuffer || !fileName) {
      return res.status(400).json({ 
        error: 'PDF buffer and filename are required' 
      });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads/pdfs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueFileName = `${req.user.id}-${timestamp}-${fileName}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    // Save PDF file
    const buffer = Buffer.from(pdfBuffer, 'base64');
    fs.writeFileSync(filePath, buffer);

    res.json({
      success: true,
      message: 'PDF saved successfully',
      fileName: uniqueFileName,
      filePath: `/api/pdf/download/${uniqueFileName}`,
      size: buffer.length
    });

  } catch (error) {
    console.error('Error saving PDF:', error);
    res.status(500).json({ 
      error: 'Failed to save PDF',
      details: error.message 
    });
  }
});

// Download saved PDF
router.get('/download/:fileName', verifyToken, (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(__dirname, '../uploads/pdfs', fileName);
    
    // Check if file exists and belongs to user
    if (!fs.existsSync(filePath) || !fileName.startsWith(req.user.id + '-')) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Send file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({ 
      error: 'Failed to download PDF',
      details: error.message 
    });
  }
});

// List saved PDFs for user
router.get('/list', verifyToken, (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../uploads/pdfs');
    
    if (!fs.existsSync(uploadsDir)) {
      return res.json({
        success: true,
        pdfs: [],
        count: 0
      });
    }

    const files = fs.readdirSync(uploadsDir);
    const userFiles = files
      .filter(file => file.startsWith(req.user.id + '-'))
      .map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          fileName: file,
          originalName: file.split('-').slice(2).join('-'),
          size: stats.size,
          createdAt: stats.birthtime,
          downloadUrl: `/api/pdf/download/${file}`
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      pdfs: userFiles,
      count: userFiles.length
    });

  } catch (error) {
    console.error('Error listing PDFs:', error);
    res.status(500).json({ 
      error: 'Failed to list PDFs',
      details: error.message 
    });
  }
});

// Delete saved PDF
router.delete('/:fileName', verifyToken, (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(__dirname, '../uploads/pdfs', fileName);
    
    // Check if file exists and belongs to user
    if (!fs.existsSync(filePath) || !fileName.startsWith(req.user.id + '-')) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Delete file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'PDF deleted successfully',
      fileName
    });

  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).json({ 
      error: 'Failed to delete PDF',
      details: error.message 
    });
  }
});

module.exports = router;