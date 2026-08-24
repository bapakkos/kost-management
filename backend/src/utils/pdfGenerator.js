const PDFDocument = require('pdfkit');

function generateInvoicePDF(res, data) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="invoice-${data.invoiceNo || 'tagihan'}.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).font('Helvetica-Bold').text('GRAHA SETIABUDI', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('Kost Graha Setiabudi - Bandung', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(12).font('Helvetica-Bold').text('TAGIHAN / INVOICE', { align: 'center' });
  doc.moveDown(0.5);

  doc.fontSize(10).font('Helvetica');
  if (data.invoiceNo) doc.text(`No: ${data.invoiceNo}`);
  doc.text(`Tanggal: ${data.date}`);
  doc.text(`Kepada: ${data.tenantName}`);
  if (data.roomNumber) doc.text(`Kamar: ${data.roomNumber}`);
  if (data.period) doc.text(`Periode: ${data.period}`);
  doc.moveDown(0.5);

  const tableTop = doc.y;
  doc.font('Helvetica-Bold');
  doc.text('Deskripsi', 50, tableTop, { width: 280 });
  doc.text('Jumlah', 400, tableTop, { width: 110, align: 'right' });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica');
  let y = doc.y;
  for (const item of data.items) {
    doc.text(item.description, 50, y, { width: 280 });
    doc.text(item.amount, 400, y, { width: 110, align: 'right' });
    y += 16;
  }

  doc.moveTo(50, y).lineTo(545, y).stroke();
  y += 10;
  doc.font('Helvetica-Bold');
  if (data.discount) {
    doc.text('Diskon', 50, y, { width: 280 });
    doc.text(`- ${data.discount}`, 400, y, { width: 110, align: 'right' });
    y += 16;
  }
  doc.text('TOTAL', 50, y, { width: 280 });
  doc.text(data.total, 400, y, { width: 110, align: 'right' });

  doc.moveDown(1.5);
  doc.fontSize(9).font('Helvetica');
  doc.text('Pembayaran via Transfer ke:', { align: 'center' });
  doc.font('Helvetica-Bold').text('BCA a.n. Graha Setiabudi', { align: 'center' });
  doc.font('Helvetica').text('No. Rekening: [Nomor Rekening BCA]', { align: 'center' });

  doc.end();
}

function generateReceiptPDF(res, data) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="nota-${data.receiptNo || 'lunas'}.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).font('Helvetica-Bold').text('GRAHA SETIABUDI', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('Kost Graha Setiabudi - Bandung', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).font('Helvetica-Bold').text('NOTA LUNAS', { align: 'center' });
  doc.moveDown(0.5);

  doc.fontSize(10).font('Helvetica');
  doc.text(`No. Nota: ${data.receiptNo}`);
  doc.text(`Tanggal: ${data.date}`);
  doc.text(`Penyewa: ${data.tenantName}`);
  if (data.roomNumber) doc.text(`Kamar: ${data.roomNumber}`);
  doc.moveDown(0.5);

  const tableTop = doc.y;
  doc.font('Helvetica-Bold');
  doc.text('Deskripsi', 50, tableTop, { width: 280 });
  doc.text('Jumlah', 400, tableTop, { width: 110, align: 'right' });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica');
  let y = doc.y;
  for (const item of data.items) {
    doc.text(item.description, 50, y, { width: 280 });
    doc.text(item.amount, 400, y, { width: 110, align: 'right' });
    y += 16;
  }

  doc.moveTo(50, y).lineTo(545, y).stroke();
  y += 10;
  doc.font('Helvetica-Bold');
  if (data.discount) {
    doc.text('Diskon Promo', 50, y, { width: 280 });
    doc.text(`- ${data.discount}`, 400, y, { width: 110, align: 'right' });
    y += 16;
  }
  doc.text('TOTAL DIBAYAR', 50, y, { width: 280 });
  doc.text(data.total, 400, y, { width: 110, align: 'right' });

  if (data.mutationRef) {
    doc.moveDown(1);
    doc.fontSize(8).font('Helvetica').text(`Ref. Mutasi Bank: ${data.mutationRef}`, { align: 'center' });
  }

  doc.moveDown(1);
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#4CAF50').text('LUNAS', { align: 'center' });
  doc.fillColor('#000000');

  doc.end();
}

module.exports = { generateInvoicePDF, generateReceiptPDF };