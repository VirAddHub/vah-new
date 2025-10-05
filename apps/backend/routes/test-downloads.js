const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Create a simple test PDF content (minimal PDF structure)
const createTestPDF = (filename) => {
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(${filename}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000369 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
465
%%EOF`;

    return Buffer.from(pdfContent, 'utf8');
};

/** GET /api/test/download/:filename - Test download endpoint */
router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;

    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ ok: false, error: 'invalid_filename' });
    }

    try {
        // Create test PDF content
        const pdfBuffer = createTestPDF(filename);

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Send the PDF
        res.send(pdfBuffer);

        console.log(`[TEST DOWNLOAD] Served test PDF: ${filename}`);

    } catch (error) {
        console.error('[TEST DOWNLOAD] Error:', error);
        res.status(500).json({ ok: false, error: 'download_failed' });
    }
});

module.exports = router;
