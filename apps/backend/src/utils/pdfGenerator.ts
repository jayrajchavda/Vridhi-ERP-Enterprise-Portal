import PDFDocument from 'pdfkit';

export class PdfGenerator {
  static generateInvoicePdf(invoice: any, stream: NodeJS.WritableStream) {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(stream);

    // Header / Company Title
    doc.fillColor('#1e293b').fontSize(20).text('VRIDHI ERP SOLUTIONS', 50, 50, { align: 'left' });
    doc.fontSize(10).fillColor('#64748b').text('Corporate Office: MIDC Industrial Area, Pune, MH');
    doc.text('GSTIN: 27VRIDH1234F1Z9 | Email: finance@vridhierp.com');
    doc.moveDown(1.5);

    // Divider
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1.5);

    // Title of Document
    doc.fillColor('#0f172a').fontSize(14).text('TAX INVOICE', { align: 'center' });
    doc.moveDown();

    const topOfInvoiceDetails = doc.y;

    // Left Column: Invoice Details
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Invoice Number: `, 50, topOfInvoiceDetails, { continued: true }).fillColor('#0f172a').text(invoice.invoiceNumber);
    doc.fillColor('#475569').text(`Invoice Date: `, 50, doc.y, { continued: true }).fillColor('#0f172a').text(new Date(invoice.createdAt).toLocaleDateString());
    doc.fillColor('#475569').text(`Challan Ref: `, 50, doc.y, { continued: true }).fillColor('#0f172a').text(invoice.challan.challanNumber);
    doc.fillColor('#475569').text(`Payment Status: `, 50, doc.y, { continued: true }).fillColor('#0f172a').text(invoice.status);

    // Right Column: Customer Details
    doc.fillColor('#475569').font('Helvetica-Bold').text('Billed To:', 300, topOfInvoiceDetails).font('Helvetica');
    doc.fillColor('#0f172a').text(invoice.customer.name, 300, doc.y);
    if (invoice.customer.businessName) {
      doc.text(invoice.customer.businessName, 300, doc.y);
    }
    doc.text(`Phone: ${invoice.customer.mobile}`, 300, doc.y);
    doc.text(`State: ${invoice.customer.state || 'N/A'}`, 300, doc.y);
    if (invoice.customer.gstNumber) {
      doc.text(`GSTIN: ${invoice.customer.gstNumber}`, 300, doc.y);
    }

    doc.moveDown(2);

    // Table Header
    const tableTop = doc.y;
    doc.fillColor('#1e293b').fontSize(10).text('Product Details', 50, tableTop);
    doc.text('SKU', 250, tableTop);
    doc.text('Qty', 350, tableTop, { width: 50, align: 'right' });
    doc.text('Price', 400, tableTop, { width: 70, align: 'right' });
    doc.text('Total', 480, tableTop, { width: 70, align: 'right' });

    doc.moveDown(0.5);
    doc.strokeColor('#cbd5e1').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Table Items
    let currentY = doc.y;
    invoice.challan.items.forEach((item: any) => {
      doc.fontSize(9).fillColor('#0f172a').text(item.productNameSnapshot, 50, currentY, { width: 190 });
      doc.text(item.skuSnapshot, 250, currentY);
      doc.text(item.quantity.toString(), 350, currentY, { width: 50, align: 'right' });
      doc.text(Number(item.unitPriceSnapshot).toFixed(2), 400, currentY, { width: 70, align: 'right' });
      doc.text(Number(item.lineTotal).toFixed(2), 480, currentY, { width: 70, align: 'right' });

      currentY = doc.y + 12;
    });

    doc.strokeColor('#e2e8f0').moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 15;

    // Totals Section
    doc.fontSize(10).fillColor('#475569');
    doc.text('Subtotal:', 350, currentY, { width: 100, align: 'left' });
    doc.fillColor('#0f172a').text(`INR ${Number(invoice.subtotal).toFixed(2)}`, 450, currentY, { width: 100, align: 'right' });
    currentY += 15;

    if (Number(invoice.cgstAmount) > 0) {
      doc.fillColor('#475569').text('CGST:', 350, currentY);
      doc.fillColor('#0f172a').text(`INR ${Number(invoice.cgstAmount).toFixed(2)}`, 450, currentY, { align: 'right' });
      currentY += 15;

      doc.fillColor('#475569').text('SGST:', 350, currentY);
      doc.fillColor('#0f172a').text(`INR ${Number(invoice.sgstAmount).toFixed(2)}`, 450, currentY, { align: 'right' });
      currentY += 15;
    }

    if (Number(invoice.igstAmount) > 0) {
      doc.fillColor('#475569').text('IGST:', 350, currentY);
      doc.fillColor('#0f172a').text(`INR ${Number(invoice.igstAmount).toFixed(2)}`, 450, currentY, { align: 'right' });
      currentY += 15;
    }

    doc.strokeColor('#cbd5e1').moveTo(350, currentY).lineTo(550, currentY).stroke();
    currentY += 10;

    doc.fontSize(12).fillColor('#0f172a').text('Total Amount:', 350, currentY);
    doc.text(`INR ${Number(invoice.totalAmount).toFixed(2)}`, 450, currentY, { align: 'right' });

    doc.end();
  }

  static generatePurchaseOrderPdf(po: any, stream: NodeJS.WritableStream) {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(stream);

    // Header
    doc.fillColor('#1e293b').fontSize(20).text('VRIDHI ERP SOLUTIONS', 50, 50, { align: 'left' });
    doc.fontSize(10).fillColor('#64748b').text('Corporate Office: MIDC Industrial Area, Pune, MH');
    doc.moveDown(1.5);

    // Divider
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1.5);

    // Title
    doc.fillColor('#0f172a').fontSize(14).text('PURCHASE ORDER', { align: 'center' });
    doc.moveDown();

    const topOfPoDetails = doc.y;

    // PO Details
    doc.fontSize(10).fillColor('#475569');
    doc.text(`PO Number: `, 50, topOfPoDetails, { continued: true }).fillColor('#0f172a').text(po.poNumber);
    doc.fillColor('#475569').text(`PO Date: `, 50, doc.y, { continued: true }).fillColor('#0f172a').text(new Date(po.createdAt).toLocaleDateString());
    doc.fillColor('#475569').text(`PO Status: `, 50, doc.y, { continued: true }).fillColor('#0f172a').text(po.status);
    doc.fillColor('#475569').text(`Created By: `, 50, doc.y, { continued: true }).fillColor('#0f172a').text(po.createdBy.name);

    // Vendor details
    doc.fillColor('#475569').text('Supplier / Vendor:', 300, topOfPoDetails);
    doc.fillColor('#0f172a').text(po.vendor.name, 300, doc.y);
    if (po.vendor.contactPerson) {
      doc.text(`Attn: ${po.vendor.contactPerson}`, 300, doc.y);
    }
    doc.text(`Phone: ${po.vendor.phone}`, 300, doc.y);
    if (po.vendor.email) {
      doc.text(`Email: ${po.vendor.email}`, 300, doc.y);
    }
    if (po.vendor.gstNumber) {
      doc.text(`GSTIN: ${po.vendor.gstNumber}`, 300, doc.y);
    }

    doc.moveDown(2);

    // Items table header
    const tableTop = doc.y;
    doc.fillColor('#1e293b').fontSize(10).text('Item Details', 50, tableTop);
    doc.text('SKU', 250, tableTop);
    doc.text('Qty Ordered', 350, tableTop, { width: 70, align: 'right' });
    doc.text('Unit Cost', 430, tableTop, { width: 60, align: 'right' });
    doc.text('Line Total', 500, tableTop, { width: 50, align: 'right' });

    doc.moveDown(0.5);
    doc.strokeColor('#cbd5e1').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    let currentY = doc.y;
    let grandTotal = 0;
    po.items.forEach((item: any) => {
      const lineCost = item.quantityOrdered * Number(item.unitCost);
      grandTotal += lineCost;

      doc.fontSize(9).fillColor('#0f172a').text(item.productNameSnapshot, 50, currentY, { width: 190 });
      doc.text(item.skuSnapshot, 250, currentY);
      doc.text(item.quantityOrdered.toString(), 350, currentY, { width: 70, align: 'right' });
      doc.text(Number(item.unitCost).toFixed(2), 430, currentY, { width: 60, align: 'right' });
      doc.text(lineCost.toFixed(2), 500, currentY, { width: 50, align: 'right' });

      currentY = doc.y + 12;
    });

    doc.strokeColor('#e2e8f0').moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 15;

    doc.fontSize(12).fillColor('#0f172a').text('Grand Total:', 350, currentY);
    doc.text(`INR ${grandTotal.toFixed(2)}`, 450, currentY, { align: 'right' });

    doc.end();
  }

  static generateChallanPdf(challan: any, stream: NodeJS.WritableStream) {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(stream);

    // Header
    doc.fillColor('#1e293b').fontSize(20).text('VRIDHI ERP SOLUTIONS', 50, 50, { align: 'left' });
    doc.fontSize(10).fillColor('#64748b').text('Corporate Office: MIDC Industrial Area, Pune, MH');
    doc.moveDown(1.5);

    // Divider
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1.5);

    // Title
    doc.fillColor('#0f172a').fontSize(14).text('DELIVERY CHALLAN', { align: 'center' });
    doc.moveDown();

    const topOfDetails = doc.y;

    // Challan Details
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Challan Number: `, 50, topOfDetails, { continued: true }).fillColor('#0f172a').text(challan.challanNumber);
    doc.fillColor('#475569').text(`Challan Date: `, 50, doc.y, { continued: true }).fillColor('#0f172a').text(new Date(challan.createdAt).toLocaleDateString());
    doc.fillColor('#475569').text(`Challan Status: `, 50, doc.y, { continued: true }).fillColor('#0f172a').text(challan.status);

    // Customer details
    doc.fillColor('#475569').text('Deliver To:', 300, topOfDetails);
    doc.fillColor('#0f172a').text(challan.customer.name, 300, doc.y);
    if (challan.customer.businessName) {
      doc.text(challan.customer.businessName, 300, doc.y);
    }
    doc.text(`Phone: ${challan.customer.mobile}`, 300, doc.y);
    doc.text(`Address: ${challan.customer.address || 'N/A'}`, 300, doc.y);

    doc.moveDown(2);

    // Items table header
    const tableTop = doc.y;
    doc.fillColor('#1e293b').fontSize(10).text('Product Description', 50, tableTop);
    doc.text('SKU', 250, tableTop);
    doc.text('Quantity', 350, tableTop, { width: 70, align: 'right' });
    doc.text('Unit Price', 430, tableTop, { width: 60, align: 'right' });
    doc.text('Total Price', 500, tableTop, { width: 50, align: 'right' });

    doc.moveDown(0.5);
    doc.strokeColor('#cbd5e1').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    let currentY = doc.y;
    challan.items.forEach((item: any) => {
      doc.fontSize(9).fillColor('#0f172a').text(item.productNameSnapshot, 50, currentY, { width: 190 });
      doc.text(item.skuSnapshot, 250, currentY);
      doc.text(item.quantity.toString(), 350, currentY, { width: 70, align: 'right' });
      doc.text(Number(item.unitPriceSnapshot).toFixed(2), 430, currentY, { width: 60, align: 'right' });
      doc.text(Number(item.lineTotal).toFixed(2), 500, currentY, { width: 50, align: 'right' });

      currentY = doc.y + 12;
    });

    doc.strokeColor('#e2e8f0').moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 15;

    doc.fontSize(12).fillColor('#0f172a').text('Total Valuation:', 350, currentY);
    doc.text(`INR ${Number(challan.totalAmount).toFixed(2)}`, 450, currentY, { align: 'right' });

    doc.end();
  }
}
