const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function todayUK() {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function safeFilename(s) {
    return String(s || '').replace(/[^\w\-]+/g, '_').slice(0, 80);
}

/**
 * Generate a Proof of Registered Address certificate PDF to a temp file and return its path.
 * It is generated fresh on each request so the Date is always "today".
 */
async function generateCertificatePDF({ clientBusinessName, clientContactName }) {
    const COMPANY = process.env.COMPANY_LEGAL_NAME || 'VirtualAddressHub Ltd';
    const CO_NUM = process.env.COMPANY_NUMBER || '—';
    const VAT = process.env.COMPANY_VAT || '—';
    const C_ADDR1 = process.env.COMPANY_ADDRESS_LINE1 || '';
    const C_ADDR2 = process.env.COMPANY_ADDRESS_LINE2 || '';
    const C_PC = process.env.COMPANY_POSTCODE || '';
    const SUPPORT = process.env.SUPPORT_EMAIL || '';
    const PHONE = process.env.SUPPORT_PHONE || '';
    const SITE = process.env.WEBSITE_URL || '';

    const VA1 = process.env.VA_LINE1 || '';
    const VA2 = process.env.VA_LINE2 || '';
    const VA_PC = process.env.VA_POSTCODE || '';

    const tmpDir = path.join(process.cwd(), 'data', 'tmp');
    fs.mkdirSync(tmpDir, { recursive: true });
    const fname = `Certificate_${safeFilename(clientBusinessName)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    const pdfPath = path.join(tmpDir, fname);

    const doc = new PDFDocument({ size: 'A4', margin: 56 }); // ~20mm
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Header (simple brand text; replace with logo image if you have)
    doc.fontSize(18).text('VirtualAddressHub — Letter of Certification', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text(todayUK(), { align: 'left' });
    doc.moveDown(1.2);
    doc.fillColor('#000');

    // Title
    doc.fontSize(14).text('Proof of Registered Address', { align: 'left' });
    doc.moveDown(0.6);

    // Body
    const letter =
        `To Whom It May Concern,

This letter confirms that the company named below is an active client of VirtualAddressHub Ltd and is authorised to use our address as their official business address under the terms of their virtual office subscription.

Client Details
• Business Name: ${clientBusinessName || '—'}
• Account Holder / Contact Name: ${clientContactName || '—'}
• Registered Address Provided:
  ${VA1}
  ${VA2}, ${VA_PC}

Under the terms of their service agreement, and in full compliance with UK regulations, this address may be used by the client as their Registered Office Address and as their Business Correspondence Address.

This certification confirms that VirtualAddressHub is providing a virtual address service. It does not imply that the client has any legal ownership of, leasehold interest in, or physical occupation of the premises.

Should you require further verification of this arrangement, please contact our support team.

Yours sincerely,
The VirtualAddressHub Team`;

    doc.fontSize(11).text(letter, { align: 'left' });
    doc.moveDown(1.2);

    // Footer / company block
    doc.moveDown();
    doc.fontSize(9).fillColor('#444')
        .text(`${COMPANY}`, { align: 'left' })
        .text(`${C_ADDR1}`)
        .text(`${C_ADDR2}${C_ADDR2 ? ', ' : ''}${C_PC}`)
        .text(`Registered in England & Wales No: ${CO_NUM}  |  VAT: ${VAT}`)
        .text(`T: ${PHONE}  |  E: ${SUPPORT}  |  W: ${SITE}`);

    doc.end();

    await new Promise((res, rej) => {
        stream.on('finish', res);
        stream.on('error', rej);
    });

    return { pdfPath, filename: fname };
}

module.exports = { generateCertificatePDF };
