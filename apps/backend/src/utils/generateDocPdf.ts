import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

function generateDocumentationPdf() {
  const readmePath = path.join(__dirname, '../../../../README.md');
  const outputPath = path.join(__dirname, '../../../../Vridhi_ERP_Documentation.pdf');

  if (!fs.existsSync(readmePath)) {
    console.error('README.md not found at:', readmePath);
    return;
  }

  const readmeContent = fs.readFileSync(readmePath, 'utf8');

  const doc = new PDFDocument({ margin: 50 });
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // --- Cover Page ---
  doc.rect(0, 0, 612, 792).fill('#1e293b');
  doc.fillColor('#ffffff').fontSize(36).font('Helvetica-Bold').text('VRIDHI ERP', 50, 250, { align: 'center' });
  doc.fontSize(16).font('Helvetica').fillColor('#94a3b8').text('OPERATIONS & TECHNICAL DOCUMENTATION', { align: 'center' });
  doc.moveDown(12);
  doc.fontSize(10).fillColor('#64748b').text('Generated: August 2026 | Version 1.0.0', { align: 'center' });

  doc.addPage();

  // --- Page Body ---
  doc.fillColor('#0f172a');
  
  // Simple markdown processor for PDFKit
  const lines = readmeContent.split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      doc.moveDown(1);
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#0f172a').text(trimmed.replace('# ', ''));
      doc.moveDown(0.5);
    } else if (trimmed.startsWith('## ')) {
      doc.moveDown(0.8);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text(trimmed.replace('## ', ''));
      doc.moveDown(0.4);
    } else if (trimmed.startsWith('### ')) {
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#475569').text(trimmed.replace('### ', ''));
      doc.moveDown(0.3);
    } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text(`  •  ${trimmed.substring(2)}`);
      doc.moveDown(0.2);
    } else if (trimmed.startsWith('|')) {
      // Table lines
      doc.fontSize(9).font('Courier-Bold').fillColor('#0f172a').text(trimmed);
      doc.moveDown(0.1);
    } else if (trimmed !== '') {
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text(trimmed);
      doc.moveDown(0.3);
    } else {
      doc.moveDown(0.3);
    }
  });

  doc.end();
  console.log('📝 Documentation PDF created successfully at:', outputPath);
}

generateDocumentationPdf();
