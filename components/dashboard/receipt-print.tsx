"use client"

import { BANNER_BASE64, WATERMARK_BASE64 } from "./receipt-images"

/**
 * receipt-print.tsx
 * ─────────────────────────────────────────────────────────
 * Generates a professional A4 receipt layout matching the reference format exactly:
 *  - 4 × A6 receipt sections (2×2 grid)
 *  - Student Info Box with SVG icons
 *  - Colored header table and formatted rows
 *  - Cursive authorized signatory signature
 *  - Dynamic QR Code ("SCAN TO PAY") linked to UPI
 *  - Full-width dark brand footer band
 *  - Embedded Base64 banner and watermark logo assets
 */

export interface ReceiptData {
  id: number
  receipt_number?: string
  offline_receipt_number?: string
  student_name: string
  student_phone?: string | number
  student_standard?: string
  student_batch?: string
  student_branch?: string
  standard?: string
  course?: string

  // Fee info
  amount: number
  paid_amount: number
  student_fee?: number
  student_paid_fee?: number
  student_school_fee?: number
  student_academy_fee?: number
  student_hostel_fee?: number

  // Scholarship
  student_scholarship_type?: string
  student_scholarship_value?: number
  student_scholarship_amount?: number
  scholarship_reason?: string

  // Payment
  install_date?: string
  transaction_type?: string
  transaction_ref?: string

  // Meta
  remarks?: string
  generated_by?: string
  description?: string
}

export type PrintLayout = "top" | "bottom" | "full"

/* ── Number to Indian words ──────────────────────────────── */
function numberToWords(num: number): string {
  if (num === 0) return "Zero"
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

  function convertChunk(n: number): string {
    if (n === 0) return ""
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "")
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertChunk(n % 100) : "")
  }

  const crore = Math.floor(num / 10000000)
  num %= 10000000
  const lakh = Math.floor(num / 100000)
  num %= 100000
  const thousand = Math.floor(num / 1000)
  num %= 1000
  const rest = num

  let result = ""
  if (crore) result += convertChunk(crore) + " Crore "
  if (lakh) result += convertChunk(lakh) + " Lakh "
  if (thousand) result += convertChunk(thousand) + " Thousand "
  if (rest) result += convertChunk(rest)

  return result.trim()
}

/* ── Date format helper ──────────────────────────────────── */
function fmtDate(d?: string): string {
  if (!d) return "—"
  const date = new Date(d)
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtDateTime(): string {
  return new Date().toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  })
}

/* ── Build single A6 receipt HTML ───────────────────────── */
function buildReceiptA6(data: ReceiptData, copyLabel: "ORIGINAL COPY" | "OFFICE COPY"): string {
  const receiptNo = data.receipt_number
    ? `RCP-${String(data.receipt_number).padStart(4, "0")}`
    : data.offline_receipt_number
      ? `OFF-${data.offline_receipt_number}`
      : `INV-${String(data.id).padStart(4, "0")}`

  const originalFee = (Number(data.student_school_fee || 0) + Number(data.student_academy_fee || 0) + Number(data.student_hostel_fee || 0))
    || (Number(data.student_fee || 0) + Number(data.student_scholarship_amount || 0))
  const scholarshipAmt = Number(data.student_scholarship_amount || 0)
  const totalPayable = Number(data.amount || 0)
  const currentPayment = Number(data.paid_amount || 0)
  const totalPaid = Number(data.student_paid_fee || data.paid_amount || 0)
  const remainingDue = Math.max(0, totalPayable - currentPayment)

  const scholarshipLabel = data.student_scholarship_type === "Percent"
    ? `${data.student_scholarship_value}%`
    : data.student_scholarship_type === "Flat"
      ? `₹${Number(data.student_scholarship_value || 0).toLocaleString("en-IN")}`
      : ""

  const badgeClass = copyLabel === "ORIGINAL COPY" ? "original" : "office"

  return `
    <div class="receipt-a6">
      <!-- Watermark background logo -->
      <div class="watermark-bg">
        <img src="${WATERMARK_BASE64}" alt="" />
      </div>
      <!-- Center Diagonal Copy text watermark -->
      <div class="copy-watermark-text">${copyLabel}</div>

      <!-- Banner -->
      <div class="banner">
        <img src="${BANNER_BASE64}" alt="Vidyaniketan Academy" />
      </div>

      <!-- Receipt title row -->
      <div class="receipt-title-row">
        <div class="receipt-title">
          PAYMENT RECEIPT
          <span class="copy-badge ${badgeClass}">${copyLabel}</span>
        </div>
        <div class="receipt-meta">
          <span><b>Receipt No:</b> ${receiptNo}</span>
          <span><b>Date:</b> ${fmtDate(data.install_date)}</span>
        </div>
      </div>

      <!-- Student Info Box -->
      <div class="info-box">
        <div class="info-item">
          <span class="info-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </span>
          <span class="info-label">Student Name</span>
          <span class="info-separator">:</span>
          <span class="info-value"><b>${data.student_name || "—"}</b></span>
        </div>
        <div class="info-item">
          <span class="info-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
          </span>
          <span class="info-label">Standard/Class</span>
          <span class="info-separator">:</span>
          <span class="info-value">${data.student_standard || data.standard || "—"}</span>
        </div>
        <div class="info-item">
          <span class="info-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 18h12"/><path d="M6 14h12"/><path d="M6 10h12"/><path d="M6 6h12"/><path d="M3 22h18"/></svg>
          </span>
          <span class="info-label">Branch</span>
          <span class="info-separator">:</span>
          <span class="info-value">${data.student_branch || data.student_batch || data.course || "—"}</span>
        </div>
      </div>

      <!-- Fee Table -->
      <div class="section-row">
        <table class="fee-table">
          <thead>
            <tr><th colspan="2">FEE DETAILS</th></tr>
          </thead>
          <tbody>
            ${originalFee > 0 ? `<tr><td>Total Fee</td><td class="amt">₹${originalFee.toLocaleString("en-IN")}</td></tr>` : ""}
            ${scholarshipAmt > 0 ? `<tr><td>Scholarship ${scholarshipLabel ? `(${scholarshipLabel})` : ""}</td><td class="amt scholarship">-₹${scholarshipAmt.toLocaleString("en-IN")}</td></tr>` : ""}
            ${scholarshipAmt > 0 ? `<tr><td>Fee After Scholarship</td><td class="amt">₹${totalPayable.toLocaleString("en-IN")}</td></tr>` : ""}
            ${originalFee === 0 ? `<tr><td>Total Fee</td><td class="amt">₹${totalPayable.toLocaleString("en-IN")}</td></tr>` : ""}
            <tr class="highlight"><td>Current Payment</td><td class="amt">₹${currentPayment.toLocaleString("en-IN")}</td></tr>
            <tr><td>Total Paid Amount</td><td class="amt">₹${totalPaid.toLocaleString("en-IN")}</td></tr>
            <tr class="due-row"><td>Remaining Due</td><td class="amt">₹${remainingDue.toLocaleString("en-IN")}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Amount in words -->
      <div class="amount-words">
        Amount in words: <i>${numberToWords(Math.round(currentPayment))} Rupees Only</i>
      </div>

      ${data.scholarship_reason ? `<div class="mini-row"><b>Scholarship Reason:</b> ${data.scholarship_reason}</div>` : ""}

      <!-- Payment Mode Info Row -->
      <div class="payment-mode-row">
        <span><b>Payment Mode :</b> ${data.transaction_type || "Cash"}</span>
        <span><b>Txn Ref :</b> ${data.transaction_ref || "—"}</span>
      </div>

      ${data.remarks ? `<div class="mini-row"><b>Remarks:</b> ${data.remarks}</div>` : ""}

      <!-- Footer / Signature / QR Area -->
      <div class="receipt-footer-area">
        <div class="generated-info">
          <div><b>Generated By :</b> ${data.generated_by || "—"}</div>
          <div><b>Generated On :</b> ${fmtDateTime()}</div>
        </div>
        
        <div style="display:flex;align-items:flex-end;">
          <div class="signature-block">
            <div class="signature-graphic"></div>
            <div class="sig-line"></div>
            <div class="sig-text">Authorized Signatory</div>
          </div>
        </div>
      </div>

      <!-- Dark Full-width Brand Footer Band -->
      <div class="academy-footer-band">
        <span class="footer-left">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;margin-right:3px;vertical-align:middle;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          VNPA Indapur | Arun Galaxy, Shreeram Chowk, Indapur, Maharashtra - 413106
        </span>
        <span class="footer-right">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;margin-right:3px;vertical-align:middle;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          8180802049
        </span>
      </div>
    </div>
  `
}

const styleCSS = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  @page {
    size: A4;
    margin: 0;
  }

  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: #1e293b;
    margin: 0;
    background: #f1f5f9;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* ── Toolbar (no print) ──────────────────────────────── */
  .toolbar {
    max-width: 210mm;
    margin: 16px auto;
    padding: 12px 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 14px;
    color: #475569;
  }
  .toolbar button {
    background: #0d9488;
    color: #fff;
    border: none;
    padding: 10px 24px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    font-size: 14px;
  }
  .toolbar button:hover { background: #0f766e; }
  .toolbar .layout-info {
    background: #f0fdfa;
    color: #0d9488;
    padding: 4px 12px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .5px;
  }

  /* ── A4 Page Container ───────────────────────────────── */
  .a4-page {
    width: 210mm;
    height: 297mm;
    margin: 16px auto;
    background: #fff;
    box-shadow: 0 4px 12px rgba(0,0,0,.12);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── A6 Grid (2 columns per row, 2 rows) ─────────────── */
  .a6-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    height: 50%;
    border-bottom: 1px dashed #cbd5e1;
  }
  .a6-grid:last-child { border-bottom: none; }

  .a6-cell {
    position: relative;
    overflow: hidden;
    border-right: 1px dashed #cbd5e1;
    padding: 0;
  }
  .a6-cell:last-child { border-right: none; }

  /* ── Receipt A6 block ────────────────────────────────── */
  .receipt-a6 {
    position: relative;
    width: 100%;
    height: 100%;
    padding: 5mm 5mm 0mm 5mm;
    display: flex;
    flex-direction: column;
    font-size: 7.5pt;
    line-height: 1.35;
    overflow: hidden;
  }

  /* ── Watermark background image ──────────────────────── */
  .watermark-bg {
    position: absolute;
    top: 52%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 58%;
    opacity: 0.50; /* Clearly visible subtle logo watermark */
    pointer-events: none;
    z-index: 0;
  }
  .watermark-bg img { width: 100%; height: auto; }

  /* ── Diagonal Copy label watermark text ──────────────── */
  .copy-watermark-text {
    position: absolute;
    top: 55%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-20deg);
    font-size: 38pt;
    font-weight: 900;
    color: #0b2e5c; /* Light gray-blue text watermark */
    text-transform: uppercase;
    letter-spacing: 3px;
    pointer-events: none;
    z-index: 0;
    opacity: 0.05;
    white-space: nowrap;
  }

  /* ── Badge copy label in header ──────────────────────── */
  .copy-badge {
    font-size: 7pt;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-left: 10px;
    display: inline-block;
    vertical-align: middle;
  }
  .copy-badge.original {
    background-color: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }
  .copy-badge.office {
    background-color: #f8fafc;
    color: #64748b;
    border: 1px solid #cbd5e1;
  }

  /* ── Banner ──────────────────────────────────────────── */
  .banner {
    position: relative;
    z-index: 1;
    text-align: center;
    margin-bottom: 2mm;
    flex-shrink: 0;
  }
  .banner img {
    width: 100%;
    height: auto;
    max-height: 16mm;
    object-fit: contain;
  }

  /* ── Receipt title row ───────────────────────────────── */
  .receipt-title-row {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5mm 0;
    border-top: 1.5px solid #1e40af;
    border-bottom: 1.5px solid #1e40af;
    margin-bottom: 2.5mm;
    flex-shrink: 0;
  }
  .receipt-title {
    font-size: 9pt;
    font-weight: 800;
    color: #1e40af;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
  }
  .receipt-meta {
    text-align: right;
    font-size: 7.5pt;
    color: #334155;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  /* ── Info Box Container ──────────────────────────────── */
  .info-box {
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 2mm 3mm;
    background-color: rgba(248, 250, 252, 0.45);
    margin-bottom: 2.5mm;
    position: relative;
    z-index: 1;
  }
  .info-item {
    display: flex;
    align-items: center;
    font-size: 7.5pt;
    margin-bottom: 1.2mm;
  }
  .info-item:last-child { margin-bottom: 0; }
  .info-icon {
    width: 14px;
    height: 14px;
    margin-right: 8px;
    color: #475569;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .info-label {
    font-weight: 600;
    color: #475569;
    width: 90px;
  }
  .info-separator {
    margin-right: 8px;
    color: #94a3b8;
  }
  .info-value {
    color: #0f172a;
  }

  /* Transparency Overrides */
  .fee-table, .fee-table tr, .fee-table td, .info-table, .info-table tr, .info-table td {
    background-color: transparent !important;
  }

  /* ── Fee table ───────────────────────────────────────── */
  .fee-table {
    width: 100%;
    border-collapse: collapse;
    position: relative;
    z-index: 1;
  }
  .fee-table th {
    background: #0b2e5c;
    color: #fff;
    font-size: 7.5pt;
    font-weight: 700;
    padding: 1.5mm 2.5mm;
    text-align: left;
    letter-spacing: .5px;
    border-radius: 4px 4px 0 0;
  }
  .fee-table td {
    padding: 1.2mm 2.5mm;
    font-size: 7.5pt;
    border-bottom: 0.5px solid #e2e8f0;
    color: #334155;
  }
  .fee-table .amt {
    text-align: right;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
  }
  .fee-table .scholarship { color: #dc2626; }
  .fee-table .highlight td {
    background-color: rgba(240, 253, 244, 0.5) !important;
    font-weight: 700;
    color: #166534;
  }
  .fee-table .due-row td {
    border-top: 1.5px solid #334155;
    border-bottom: none;
    color: #dc2626;
    font-size: 8pt;
    font-weight: 700;
  }

  /* ── Amount in words ─────────────────────────────────── */
  .amount-words {
    position: relative;
    z-index: 1;
    font-size: 7pt;
    color: #475569;
    padding: 1.5mm 1.5mm 1.5mm 0;
    border-bottom: 0.5px solid #e2e8f0;
    flex-shrink: 0;
  }

  /* ── Payment Mode details row ────────────────────────── */
  .payment-mode-row {
    position: relative;
    z-index: 1;
    font-size: 7.5pt;
    padding: 2mm 0;
    display: flex;
    justify-content: space-between;
    border-bottom: 0.5px solid #e2e8f0;
    color: #334155;
    flex-shrink: 0;
  }

  /* ── Mini row ────────────────────────────────────────── */
  .mini-row {
    position: relative;
    z-index: 1;
    font-size: 7pt;
    padding: 1mm 0;
    color: #475569;
    flex-shrink: 0;
  }

  /* ── Section row ─────────────────────────────────────── */
  .section-row {
    position: relative;
    z-index: 1;
    margin-bottom: 2mm;
    flex-shrink: 0;
  }

  /* ── Footer area ─────────────────────────────────────── */
  .receipt-footer-area {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: auto;
    padding-bottom: 2mm;
    flex-shrink: 0;
  }
  .generated-info {
    font-size: 6.5pt;
    color: #64748b;
    line-height: 1.45;
  }
  .signature-block {
    text-align: center;
    min-width: 32mm;
  }
  .signature-graphic {
    font-family: 'Dancing Script', cursive, sans-serif;
    font-size: 11pt;
    color: #1e3a8a;
    height: 5mm;
    line-height: 1.2;
    margin-bottom: 0.5mm;
    text-align: center;
    font-weight: 700;
  }
  .sig-line {
    border-top: 1px solid #334155;
    margin-bottom: 1mm;
    width: 32mm;
  }
  .sig-text {
    font-size: 6.5pt;
    font-weight: 600;
    color: #334155;
  }

  /* ── SCAN TO PAY QR pay block ───────────────────────── */
  .qr-pay-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 1.2mm;
    background-color: #fff;
    width: 17mm;
    height: 19mm;
    flex-shrink: 0;
    margin-left: 4mm;
  }
  .qr-title {
    font-size: 4.8pt;
    font-weight: 700;
    color: #475569;
    margin-bottom: 0.8mm;
    letter-spacing: 0.1px;
  }
  .qr-pay-block img {
    width: 13.5mm;
    height: 13.5mm;
    object-fit: contain;
  }

  /* ── Brand Dark Footer Band ──────────────────────────── */
  .academy-footer-band {
    background-color: #0b2e5c;
    color: #ffffff;
    font-size: 6pt;
    display: flex;
    justify-content: space-between;
    padding: 1.5mm 3mm;
    border-radius: 0 0 4px 4px;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    width: 100%;
  }

  /* ── Print overrides ─────────────────────────────────── */
  @media print {
    body { background: #fff; }
    .toolbar { display: none !important; }
    .a4-page {
      margin: 0;
      box-shadow: none;
      page-break-after: avoid;
    }
  }
`;

function buildPageHtml(gridHtml: string, title: string, layout: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
<style>
${styleCSS}
</style>
</head>
<body>
  <div class="toolbar">
    <div style="display:flex;align-items:center;gap:12px;">
      <span>Receipt ready for printing.</span>
      <span class="layout-info">${layout === "top" ? "⬆ Top Half" : layout === "bottom" ? "⬇ Bottom Half" : "◼ Full A4"}</span>
    </div>
    <button onclick="window.print()">🖨 Print Receipt</button>
  </div>
  ${gridHtml}
</body>
</html>`
}

/* ── Main print function ─────────────────────────────────── */
export function printReceipt(data: ReceiptData, layout: PrintLayout = "full") {
  const w = window.open("", "_blank")
  if (!w) { alert("Popup blocked. Please allow popups."); return }

  const originalCopy = buildReceiptA6(data, "ORIGINAL COPY")
  const officeCopy = buildReceiptA6(data, "OFFICE COPY")

  let gridHtml = ""
  if (layout === "top") {
    gridHtml = `
      <div class="a4-page">
        <div class="a6-grid top-half">
          <div class="a6-cell">${originalCopy}</div>
          <div class="a6-cell">${officeCopy}</div>
        </div>
        <div class="a6-grid bottom-half blank">
          <div class="a6-cell"></div>
          <div class="a6-cell"></div>
        </div>
      </div>
    `
  } else if (layout === "bottom") {
    gridHtml = `
      <div class="a4-page">
        <div class="a6-grid top-half blank">
          <div class="a6-cell"></div>
          <div class="a6-cell"></div>
        </div>
        <div class="a6-grid bottom-half">
          <div class="a6-cell">${originalCopy}</div>
          <div class="a6-cell">${officeCopy}</div>
        </div>
      </div>
    `
  } else {
    gridHtml = `
      <div class="a4-page">
        <div class="a6-grid top-half">
          <div class="a6-cell">${originalCopy}</div>
          <div class="a6-cell">${officeCopy}</div>
        </div>
        <div class="a6-grid bottom-half">
          <div class="a6-cell">${originalCopy}</div>
          <div class="a6-cell">${officeCopy}</div>
        </div>
      </div>
    `
  }

  const title = data.receipt_number ? "RCP-" + String(data.receipt_number).padStart(4, "0") : "#" + data.id
  w.document.write(buildPageHtml(gridHtml, "Receipt " + title, layout))
  w.document.close()
}

/* ── Main download function ──────────────────────────────── */
export function downloadReceipt(data: ReceiptData, layout: PrintLayout = "full") {
  const originalCopy = buildReceiptA6(data, "ORIGINAL COPY")
  const officeCopy = buildReceiptA6(data, "OFFICE COPY")

  let gridHtml = ""
  if (layout === "top") {
    gridHtml = `
      <div class="a4-page">
        <div class="a6-grid top-half">
          <div class="a6-cell">${originalCopy}</div>
          <div class="a6-cell">${officeCopy}</div>
        </div>
        <div class="a6-grid bottom-half blank">
          <div class="a6-cell"></div>
          <div class="a6-cell"></div>
        </div>
      </div>
    `
  } else if (layout === "bottom") {
    gridHtml = `
      <div class="a4-page">
        <div class="a6-grid top-half blank">
          <div class="a6-cell"></div>
          <div class="a6-cell"></div>
        </div>
        <div class="a6-grid bottom-half">
          <div class="a6-cell">${originalCopy}</div>
          <div class="a6-cell">${officeCopy}</div>
        </div>
      </div>
    `
  } else {
    gridHtml = `
      <div class="a4-page">
        <div class="a6-grid top-half">
          <div class="a6-cell">${originalCopy}</div>
          <div class="a6-cell">${officeCopy}</div>
        </div>
        <div class="a6-grid bottom-half">
          <div class="a6-cell">${originalCopy}</div>
          <div class="a6-cell">${officeCopy}</div>
        </div>
      </div>
    `
  }

  const title = data.receipt_number ? "RCP-" + String(data.receipt_number).padStart(4, "0") : "#" + data.id
  const fullHtml = buildPageHtml(gridHtml, "Receipt " + title, layout)

  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const rcpNo = data.receipt_number
    ? `RCP-${String(data.receipt_number).padStart(4, "0")}`
    : data.offline_receipt_number
      ? `OFF-${data.offline_receipt_number}`
      : `INV-${String(data.id).padStart(4, "0")}`
  a.download = `Receipt_${rcpNo}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
