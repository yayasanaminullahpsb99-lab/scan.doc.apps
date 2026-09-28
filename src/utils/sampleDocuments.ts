/**
 * Generates sample documents (Invoice, Receipt, Certificate) rendered onto a slightly tilted canvas
 * so users can test edge detection, 4-corner perspective warp, filters, and PDF export instantly!
 */

export interface SampleDoc {
  id: string;
  name: string;
  category: string;
  generateDataUrl: () => string;
}

export function createSampleInvoice(): string {
  const w = 1200;
  const h = 1600;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background surface (wooden / modern desk with subtle gradient and shadows)
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#2d3748');
  bgGrad.addColorStop(1, '#1a202c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Simulate a document placed at a slight angle on the desk with realistic shadow
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((3.5 * Math.PI) / 180); // 3.5 deg tilt
  ctx.translate(-w / 2, -h / 2);

  const docX = 140;
  const docY = 120;
  const docW = 920;
  const docH = 1360;

  // Drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetX = 15;
  ctx.shadowOffsetY = 25;

  // Paper sheet
  ctx.fillStyle = '#fdfbf7'; // subtle warm paper color
  ctx.fillRect(docX, docY, docW, docH);

  // Reset shadow for text and graphics inside paper
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Header Bar
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(docX + 50, docY + 50, docW - 100, 12);

  // Logo & Company Name
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('PT. MITRA NUSANTARA DIGITAL', docX + 50, docY + 110);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Jl. Jend. Sudirman Kav. 52-53, Jakarta Selatan 12190', docX + 50, docY + 145);
  ctx.fillText('Email: billing@mitradigital.co.id | NPWP: 01.345.678.9-012.000', docX + 50, docY + 175);

  // INVOICE Title
  ctx.fillStyle = '#1e40af';
  ctx.font = '800 48px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('INVOICE TAGIHAN RESMI', docX + 50, docY + 260);

  // Invoice Meta Info Box
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(docX + 50, docY + 290, docW - 100, 120);

  ctx.fillStyle = '#475569';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Nomor Invoice :', docX + 75, docY + 335);
  ctx.fillText('Tanggal Terbit :', docX + 75, docY + 380);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('INV-2026/09/X-8841', docX + 240, docY + 335);
  ctx.fillText('28 September 2026', docX + 240, docY + 380);

  ctx.fillStyle = '#475569';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Jatuh Tempo :', docX + 520, docY + 335);
  ctx.fillText('Status :', docX + 520, docY + 380);

  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('15 Oktober 2026', docX + 660, docY + 335);

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('BELUM LUNAS', docX + 660, docY + 380);

  // Table Header
  const tableY = docY + 450;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(docX + 50, tableY, docW - 100, 48);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('No.', docX + 70, tableY + 32);
  ctx.fillText('Deskripsi Layanan / Barang', docX + 130, tableY + 32);
  ctx.fillText('Qty', docX + 530, tableY + 32);
  ctx.fillText('Harga Satuan', docX + 600, tableY + 32);
  ctx.fillText('Total (IDR)', docX + 740, tableY + 32);

  // Table Rows
  const items = [
    { no: '1', desc: 'Pengembangan Web App & Scanner Engine', qty: '1', price: 'Rp 14.500.000', total: 'Rp 14.500.000' },
    { no: '2', desc: 'Integrasi Cloud OCR & Document API', qty: '1', price: 'Rp 4.250.000', total: 'Rp 4.250.000' },
    { no: '3', desc: 'Pemeliharaan Server & SSL Certificate 1 Thn', qty: '1', price: 'Rp 2.800.000', total: 'Rp 2.800.000' },
    { no: '4', desc: 'Pelatihan Operator & Dokumentasi Teknis', qty: '1', price: 'Rp 1.500.000', total: 'Rp 1.500.000' }
  ];

  let rowY = tableY + 80;
  ctx.font = '500 17px "Plus Jakarta Sans", sans-serif';
  items.forEach((item) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillText(item.no, docX + 75, rowY);
    ctx.fillText(item.desc, docX + 130, rowY);
    ctx.fillText(item.qty, docX + 540, rowY);
    ctx.fillText(item.price, docX + 600, rowY);
    ctx.fillText(item.total, docX + 740, rowY);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(docX + 50, rowY + 20);
    ctx.lineTo(docX + docW - 50, rowY + 20);
    ctx.stroke();

    rowY += 60;
  });

  // Total summary box
  const totalBoxY = rowY + 30;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(docX + 480, totalBoxY, docW - 530, 160);
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(docX + 480, totalBoxY, docW - 530, 160);

  ctx.fillStyle = '#475569';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Subtotal :', docX + 505, totalBoxY + 40);
  ctx.fillText('PPN (11%) :', docX + 505, totalBoxY + 80);
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#1e3a8a';
  ctx.fillText('TOTAL AKHIR :', docX + 505, totalBoxY + 130);

  ctx.fillStyle = '#0f172a';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Rp 23.050.000', docX + 670, totalBoxY + 40);
  ctx.fillText('Rp 2.535.500', docX + 670, totalBoxY + 80);
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#1e40af';
  ctx.fillText('Rp 25.585.500', docX + 665, totalBoxY + 130);

  // Bank transfer info
  ctx.fillStyle = '#334155';
  ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Instruksi Pembayaran:', docX + 60, totalBoxY + 40);
  ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Bank BCA KCU Sudirman', docX + 60, totalBoxY + 70);
  ctx.fillText('No. Rekening: 5410-992-881', docX + 60, totalBoxY + 98);
  ctx.fillText('A.N: PT Mitra Nusantara Digital', docX + 60, totalBoxY + 126);

  // Official Stamp (Stempel Biru / Ungu)
  ctx.save();
  ctx.translate(docX + 720, docY + 1180);
  ctx.rotate((-12 * Math.PI) / 180);
  ctx.strokeStyle = 'rgba(29, 78, 216, 0.75)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, 68, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 60, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(29, 78, 216, 0.8)';
  ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PT MITRA NUSANTARA', 0, -25);
  ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('★ VERIFIED ★', 0, 5);
  ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('FINANCE DEPT', 0, 35);
  ctx.restore();

  // Signature
  ctx.fillStyle = '#1e293b';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Hormat Kami,', docX + 680, docY + 1100);
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('( Rahmat Hidayat, S.Kom )', docX + 650, docY + 1280);
  ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Direktur Keuangan', docX + 695, docY + 1305);

  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.92);
}

export function createSampleReceipt(): string {
  const w = 1000;
  const h = 1500;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Desk background with dark wood tone
  ctx.fillStyle = '#222831';
  ctx.fillRect(0, 0, w, h);

  // Slight angle
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((-4.5 * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);

  const docX = 220;
  const docY = 100;
  const docW = 560;
  const docH = 1250;

  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = -10;
  ctx.shadowOffsetY = 20;

  // Thermal paper style
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(docX, docY, docW, docH);

  ctx.shadowColor = 'transparent';

  // Receipt Content
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 30px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SUPERMARKET PRIMA', docX + docW / 2, docY + 80);

  ctx.font = '500 16px "JetBrains Mono", monospace';
  ctx.fillText('MALL CENTRAL PARK LT. LG-12', docX + docW / 2, docY + 115);
  ctx.fillText('TELP: (021) 5698-5500', docX + docW / 2, docY + 140);
  ctx.fillText('================================', docX + docW / 2, docY + 175);

  ctx.textAlign = 'left';
  ctx.font = '500 15px "JetBrains Mono", monospace';
  ctx.fillText('Tgl: 28/09/2026 14:32:05', docX + 35, docY + 215);
  ctx.fillText('Kasir: SITI FATIMAH [POS-04]', docX + 35, docY + 245);
  ctx.fillText('Struk No: STR-8829104', docX + 35, docY + 275);
  ctx.fillText('--------------------------------', docX + 35, docY + 305);

  const items = [
    { name: 'SUSU UHT FULL CREAM 1L', qty: '2x', price: '21.500', tot: '43.000' },
    { name: 'ROTI GANDUM TAWAR SPESIAL', qty: '1x', price: '18.000', tot: '18.000' },
    { name: 'KOPI ARABIKA GAYO 250G', qty: '1x', price: '65.000', tot: '65.000' },
    { name: 'MINYAK GORENG 2L TROPICAL', qty: '2x', price: '38.500', tot: '77.000' },
    { name: 'TISU WAJAH 250 SHEETS', qty: '3x', price: '12.000', tot: '36.000' },
    { name: 'TELUR AYAM OMEGA 10 BUTIR', qty: '1x', price: '32.500', tot: '32.500' },
  ];

  let yPos = docY + 345;
  items.forEach(item => {
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText(item.name, docX + 35, yPos);
    ctx.font = '500 15px "JetBrains Mono", monospace';
    ctx.fillText(`${item.qty} @${item.price}`, docX + 35, yPos + 24);
    ctx.textAlign = 'right';
    ctx.fillText(item.tot, docX + docW - 35, yPos + 24);
    ctx.textAlign = 'left';
    yPos += 58;
  });

  ctx.fillText('--------------------------------', docX + 35, yPos);
  yPos += 35;

  ctx.font = 'bold 17px "JetBrains Mono", monospace';
  ctx.fillText('TOTAL BELANJA', docX + 35, yPos);
  ctx.textAlign = 'right';
  ctx.fillText('Rp 271.500', docX + docW - 35, yPos);
  ctx.textAlign = 'left';

  yPos += 35;
  ctx.font = '500 15px "JetBrains Mono", monospace';
  ctx.fillText('TUNAI / CASH', docX + 35, yPos);
  ctx.textAlign = 'right';
  ctx.fillText('Rp 300.000', docX + docW - 35, yPos);
  ctx.textAlign = 'left';

  yPos += 30;
  ctx.fillText('KEMBALIAN', docX + 35, yPos);
  ctx.textAlign = 'right';
  ctx.fillText('Rp 28.500', docX + docW - 35, yPos);
  ctx.textAlign = 'left';

  yPos += 50;
  ctx.textAlign = 'center';
  ctx.font = '500 14px "JetBrains Mono", monospace';
  ctx.fillText('TERIMA KASIH ATAS KUNJUNGAN ANDA', docX + docW / 2, yPos);
  ctx.fillText('BARANG YANG DIBELI TIDAK DAPAT', docX + docW / 2, yPos + 25);
  ctx.fillText('DITUKAR KECUALI DENGAN STRUK ASLI', docX + docW / 2, yPos + 50);

  // Barcode simulation
  yPos += 90;
  ctx.fillStyle = '#000000';
  for (let x = docX + 70; x < docX + docW - 70; x += 4) {
    if (Math.random() > 0.4) {
      ctx.fillRect(x, yPos, Math.random() > 0.5 ? 3 : 1.5, 60);
    }
  }
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText('9 872194 001928', docX + docW / 2, yPos + 80);

  ctx.restore();
  return canvas.toDataURL('image/jpeg', 0.92);
}

export function createSampleCertificate(): string {
  const w = 1500;
  const h = 1100;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Surface background
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((2.2 * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);

  const docX = 150;
  const docY = 100;
  const docW = 1200;
  const docH = 900;

  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 35;
  ctx.shadowOffsetX = 12;
  ctx.shadowOffsetY = 20;

  // Certificate paper with gold border
  ctx.fillStyle = '#fffdfa';
  ctx.fillRect(docX, docY, docW, docH);
  ctx.shadowColor = 'transparent';

  // Ornate double border
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 6;
  ctx.strokeRect(docX + 30, docY + 30, docW - 60, docH - 60);

  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2;
  ctx.strokeRect(docX + 42, docY + 42, docW - 84, docH - 84);

  // Corner decorations
  ctx.fillStyle = '#d97706';
  ctx.fillRect(docX + 25, docY + 25, 20, 20);
  ctx.fillRect(docX + docW - 45, docY + 25, 20, 20);
  ctx.fillRect(docX + 25, docY + docH - 45, 20, 20);
  ctx.fillRect(docX + docW - 45, docY + docH - 45, 20, 20);

  // Certificate Text
  ctx.textAlign = 'center';
  ctx.fillStyle = '#92400e';
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('AKADEMI TEKNOLOGI & INFORMATIKA INDONESIA', docX + docW / 2, docY + 130);

  ctx.fillStyle = '#1e3a8a';
  ctx.font = '800 52px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('SERTIFIKAT PENGHARGAAN', docX + docW / 2, docY + 210);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Diberikan dengan bangga kepada:', docX + docW / 2, docY + 280);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 44px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('AHMAD FAUZI, S.Kom., M.T.', docX + docW / 2, docY + 360);

  // Underline for recipient
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(docX + 250, docY + 380);
  ctx.lineTo(docX + docW - 250, docY + 380);
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Atas dedikasi, pencapaian istimewa, dan kelulusan program', docX + docW / 2, docY + 440);
  ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#1e40af';
  ctx.fillText('"Advanced Computer Vision & Document Intelligence Masterclass"', docX + docW / 2, docY + 485);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Jakarta, 28 September 2026 | No. Sertifikat: CERT-ATII/2026/IX-994', docX + docW / 2, docY + 540);

  // Golden Medal Seal
  ctx.save();
  ctx.translate(docX + docW / 2, docY + 680);
  const sealGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 65);
  sealGrad.addColorStop(0, '#fef08a');
  sealGrad.addColorStop(0.7, '#eab308');
  sealGrad.addColorStop(1, '#ca8a04');
  ctx.fillStyle = sealGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#78350f';
  ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('GOLD MEDAL', 0, -8);
  ctx.fillText('★ EXCELLENCE ★', 0, 16);
  ctx.restore();

  // Signatures
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Prof. Dr. Ir. Bambang Suherman', docX + 260, docY + 760);
  ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Ketua Dewan Penguji', docX + 260, docY + 790);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Dr. Ratna Kusuma, M.Sc.', docX + docW - 260, docY + 760);
  ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Direktur Eksekutif', docX + docW - 260, docY + 790);

  ctx.restore();
  return canvas.toDataURL('image/jpeg', 0.92);
}

export const SAMPLE_DOCUMENTS: SampleDoc[] = [
  {
    id: 'invoice',
    name: 'Invoice Tagihan Resmi',
    category: 'Bisnis / Keuangan',
    generateDataUrl: createSampleInvoice
  },
  {
    id: 'receipt',
    name: 'Struk Belanja Supermarket',
    category: 'Kuitansi & Belanja',
    generateDataUrl: createSampleReceipt
  },
  {
    id: 'certificate',
    name: 'Sertifikat Penghargaan Resmi',
    category: 'Dokumen Legal',
    generateDataUrl: createSampleCertificate
  }
];
