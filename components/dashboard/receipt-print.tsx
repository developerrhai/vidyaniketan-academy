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
  student_receipt_serial_number?: number
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
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function fmtDateTime(): string {
  const date = new Date()
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  
  let hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12
  hours = hours ? hours : 12
  const strTime = String(hours).padStart(2, "0") + ':' + minutes + ' ' + ampm
  
  return `${day}/${month}/${year}, ${strTime}`
}

/* ── Build single A6 receipt HTML ───────────────────────── */
export function buildReceiptA6(data: ReceiptData, copyLabel: "ORIGINAL COPY" | "OFFICE COPY"): string {
  const onlineReceiptNo = `RCP-${String(data.receipt_number || data.id).padStart(4, "0")}`
  const offlineReceiptNo = data.offline_receipt_number ? `OFF-${data.offline_receipt_number}` : "_________________"
  const studentSerialNo = data.student_receipt_serial_number ? `${data.student_receipt_serial_number}` : "1"

  const originalFee = (Number(data.student_school_fee || 0) + Number(data.student_academy_fee || 0) + Number(data.student_hostel_fee || 0))
    || (Number(data.student_fee || 0) + Number(data.student_scholarship_amount || 0))
  const scholarshipAmt = Number(data.student_scholarship_amount || 0)
  const totalPayable = Number(data.student_fee || data.amount || 0)
  const currentPayment = Number(data.paid_amount || 0)
  const totalPaid = Number(data.student_paid_fee || data.paid_amount || 0)
  const remainingDue = Math.max(0, totalPayable - totalPaid)

  const scholarshipLabel = data.student_scholarship_type === "Percent"
    ? `${data.student_scholarship_value}%`
    : data.student_scholarship_type === "Flat"
      ? `₹${Number(data.student_scholarship_value || 0).toLocaleString("en-IN")}`
      : ""

  const badgeClass = copyLabel === "ORIGINAL COPY" ? "original" : "office"
  const formattedCopyLabel = copyLabel === "ORIGINAL COPY" ? "Original Copy" : "Office Copy"

  return `
    <!-- MAIN WRAPPER: Limits size to A6 proportions and sets background context -->
    <div class="receipt-a6">
      
      <!-- SUBTLE WATERMARK: Positioned absolutely in the center with very low opacity for peak readability -->
      <div class="watermark-bg">
        <img src="${WATERMARK_BASE64}" alt="" />
      </div>

      <!-- HEADER LOGO: Rendered via optimized embedded Base64 vector asset -->
      <div class="banner">
        <img src="${BANNER_BASE64}" alt="Vidyaniketan Academy" />
      </div>

      <!-- METADATA GRID: Balanced 3-column layout guiding the eye naturally across categories -->
      <div class="receipt-title-row">
        
        <!-- Left Column: Shorter, cleaner labels to prevent line wrapping -->
        <div class="receipt-meta-left">
          <div style="display: flex; gap: 4px; white-space: nowrap;">
            <span style="font-weight: 600; color: #475569;">Receipt No:</span>
            <span style="color: #0f172a; font-weight: 700;">${onlineReceiptNo}</span>
          </div>
          <span style="color: #cbd5e1;">|</span>
          <div style="display: flex; gap: 4px; white-space: nowrap;">
            <span style="font-weight: 600; color: #475569;">Offline Ref:</span>
            <span style="color: #0f172a; font-weight: 700;">${offlineReceiptNo}</span>
          </div>
        </div>

        <!-- Center Column: Primary Title and Pill-Shaped Security Badge -->
        <div class="receipt-title-center">
          <div class="receipt-title">PAYMENT RECEIPT</div>
          <div style="margin-top: 1mm; display: flex; justify-content: center;">
            <span class="copy-badge ${badgeClass}">${formattedCopyLabel}</span>
          </div>
        </div>

        <!-- Right Column: Contextual tracking metadata aligned to the right margin -->
        <div class="receipt-meta-right">
          <div style="display: flex; justify-content: flex-end; gap: 4px; width: 100%;">
            <span style="font-weight: 600; color: #475569;">Date:</span>
            <span style="color: #0f172a; font-weight: 700;">${fmtDate(data.install_date)}</span>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 4px; width: 100%;">
            <span style="font-weight: 600; color: #475569;">Student Serial No:</span>
            <span style="color: #0f172a; font-weight: 700;">${studentSerialNo}</span>
          </div>
        </div>
      </div>

      <!-- STUDENT DETAILS CARD: Low cognitive load block with modern typography and alignment -->
      <div class="info-box">
        <!-- Student Name Row -->
        <span class="info-icon">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </span>
        <span class="info-label">Student Name</span>
        <span class="info-separator">:</span>
        <span class="info-value"><b>${data.student_name || "—"}</b></span>

        <!-- Academic Standard Row -->
        <span class="info-icon">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
        </span>
        <span class="info-label">Standard / Class</span>
        <span class="info-separator">:</span>
        <span class="info-value">${data.student_standard || data.standard || "—"}</span>

        <!-- Branch / Batch Location Row -->
        <span class="info-icon">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 18h12"/><path d="M6 14h12"/><path d="M6 10h12"/><path d="M6 6h12"/><path d="M3 22h18"/></svg>
        </span>
        <span class="info-label">Branch & Batch</span>
        <span class="info-separator">:</span>
        <span class="info-value">${data.student_branch || data.student_batch || data.course || "—"}</span>
      </div>

      <!-- FINANCIAL SUMMARY TABLE: Tabular alignment of items with clean high-contrast values -->
      <div class="section-row">
        <table class="fee-table">
          <thead>
            <tr>
              <th style="width: 70%;">FEE PARTICULARS</th>
              <th style="width: 30%; text-align: right;">AMOUNT (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${originalFee > 0 ? `<tr><td>Total Course Fee</td><td class="amt">₹${originalFee.toLocaleString("en-IN")}</td></tr>` : ""}
            ${scholarshipAmt > 0 ? `<tr><td>Scholarship Benefit ${scholarshipLabel ? `(${scholarshipLabel})` : ""}</td><td class="amt scholarship">-₹${scholarshipAmt.toLocaleString("en-IN")}</td></tr>` : ""}
            ${scholarshipAmt > 0 ? `<tr><td>Net Payable Fee</td><td class="amt">₹${totalPayable.toLocaleString("en-IN")}</td></tr>` : ""}
            ${originalFee === 0 ? `<tr><td>Total Course Fee</td><td class="amt">₹${totalPayable.toLocaleString("en-IN")}</td></tr>` : ""}
            
            <!-- CURRENT PAYMENT: Highlighted with emerald tint for immediate transaction visibility -->
            <tr class="highlight"><td>Current Payment (Paid Now)</td><td class="amt">₹${currentPayment.toLocaleString("en-IN")}</td></tr>
            
            <tr><td>Total Fee Collected So Far</td><td class="amt">₹${totalPaid.toLocaleString("en-IN")}</td></tr>
            
            <!-- BALANCE DUE: Bold red styling for attention without using heavy ink backgrounds -->
            <tr class="due-row"><td>Remaining Balance Due</td><td class="amt">₹${remainingDue.toLocaleString("en-IN")}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- LEGAL/COMPLIANCE METADATA: Ink-friendly rows for proof of transaction -->
      <div class="amount-words">
        Amount in words: <i>${numberToWords(Math.round(currentPayment))} Rupees Only</i>
      </div>

      ${data.scholarship_reason ? `<div class="mini-row"><b>Scholarship Reason:</b> ${data.scholarship_reason}</div>` : ""}

      <!-- PAYMENT MODE: Prominent details on transaction method -->
      <div class="payment-mode-row">
        <span><b>Payment Mode:</b> ${data.transaction_type || "Cash"}</span>
        <span><b>Txn Ref:</b> ${data.transaction_ref || "—"}</span>
      </div>

      <!-- Invisible remarks spacer to maintain exact vertical whitespace budget -->
      <div class="mini-row" style="visibility: hidden;">&nbsp;</div>

      <!-- SIGNATORY & FOOTER BLOCK: Authoritative signature zone and brand contact info -->
      <div class="receipt-footer-area">
        <div class="footer-info-left">
          <div><b>Generated On:</b> ${fmtDateTime()}</div>
          <div style="font-size: 5.5pt; color: #64748b; margin-top: 0.8mm; font-style: italic;">* This is a system generated invoice.</div>
        </div>
        <div class="footer-info-right">
          <div><b>Generated By:</b> ${data.generated_by || "—"}</div>
        </div>
      </div>

      <!-- DARK FOOTER ACCENT: Deep blue anchor giving the document an official, certified finish -->
      <div class="academy-footer-band">
        <span class="footer-address">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;margin-right:3px;vertical-align:middle;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          Shreeram Chowk, Akluj Naka, Indapur, Maharashtra - 413106
        </span>
        <span class="footer-phone">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;margin-right:3px;vertical-align:middle;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          8180802049
        </span>
      </div>
    </div>
  `
}

export const styleCSS = `
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
    padding: 3mm 4mm 0mm 4mm; /* Compact padding to keep content budget within A6 height limit */
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
    opacity: 0.50;
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
    font-size: 6.2pt; /* Tighter copy badge font size */
    font-weight: 700;
    padding: 1.5px 6.5px; /* Compact padding for small pill stamp */
    border-radius: 9999px; /* Official security stamp-like pill shape */
    text-transform: uppercase;
    letter-spacing: 0.8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .copy-badge.original {
    background-color: #f0fdf4; /* Light emerald green background for distinct safety look */
    color: #166534;
    border: 1px solid #bbf7d0;
  }
  .copy-badge.office {
    background-color: #f8fafc; /* Professional neutral slate background */
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  /* ── Banner ──────────────────────────────────────────── */
  .banner {
    position: relative;
    z-index: 1;
    text-align: center;
    margin-bottom: 1.5mm; /* Reduced space */
    flex-shrink: 0;
  }
  .banner img {
    width: 100%;
    height: auto;
    max-height: 11mm; /* Compact brand logo height to save vertical budget */
    object-fit: contain;
  }

  /* ── Receipt title row ───────────────────────────────── */
  .receipt-title-row {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.2mm 0; /* Compact vertical padding */
    border-top: 1.5px solid #1e40af;
    border-bottom: 1.5px solid #1e40af;
    margin-bottom: 2mm; /* Reduced margin */
    flex-shrink: 0;
  }
  .receipt-meta-left {
    font-size: 7.2pt;
    color: #334155;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    width: 42%;
  }
  .receipt-title-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    width: 28%;
  }
  .receipt-title {
    font-size: 9pt;
    font-weight: 800;
    color: #1e40af;
    letter-spacing: 0.5px;
    white-space: nowrap; /* Prevent title wrapping on small screens/containers */
  }
  .receipt-meta-right {
    font-size: 7.2pt;
    color: #334155;
    display: flex;
    flex-direction: column;
    gap: 2.5px;
    align-items: flex-end;
    width: 30%;
  }

  /* ── Info Box Container ──────────────────────────────── */
  .info-box {
    border: 1px solid #e2e8f0;
    border-radius: 6px; /* Smooth professional border radius */
    padding: 2mm 3.2mm; /* Reduced card padding */
    background-color: #f8fafc; /* Modern light card background for clean separation */
    margin-bottom: 1.8mm; /* Reduced card margin */
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: auto auto auto 1fr;
    row-gap: 1.2mm; /* Compact gap */
    column-gap: 2mm;
    align-items: center;
  }
  .info-icon {
    width: 14px;
    height: 14px;
    color: #475569;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .info-label {
    font-weight: 600;
    color: #475569;
    font-size: 7.5pt;
  }
  .info-separator {
    color: #94a3b8;
    font-size: 7.5pt;
  }
  .info-value {
    color: #0f172a;
    font-size: 7.5pt;
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
    background: #0f172a; /* Premium dark slate header to highlight branding */
    color: #ffffff;
    font-size: 7.5pt;
    font-weight: 700;
    padding: 1.4mm 2.2mm; /* Compact header cell padding */
    text-align: left;
    letter-spacing: 0.5px;
  }
  .fee-table td {
    padding: 1.1mm 2.2mm; /* Compact body cell padding */
    font-size: 7.5pt;
    border-bottom: 1px solid #f1f5f9; /* Ink-friendly modern divider lines */
    color: #334155;
  }
  .fee-table .amt {
    text-align: right;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
  }
  .fee-table .scholarship { color: #b91c1c; } /* Distinct deep red scholarship color */
  .fee-table .highlight td {
    background-color: #f0fdf4 !important; /* Soft emerald background for current payment tracking */
    font-weight: 700;
    color: #166534;
    border-bottom: 1px solid #bbf7d0;
  }
  .fee-table .due-row td {
    background-color: #fef2f2 !important; /* Soft rose background for immediate attention on pending dues */
    color: #991b1b;
    font-size: 8pt;
    font-weight: 700;
    border-top: 1px solid #fecaca;
    border-bottom: 1px solid #fecaca;
  }

  /* ── Amount in words ─────────────────────────────────── */
  .amount-words {
    position: relative;
    z-index: 1;
    font-size: 7pt;
    color: #475569;
    padding: 1mm 1.5mm 1mm 0; /* Compact amount padding */
    border-bottom: 0.5px solid #e2e8f0;
    flex-shrink: 0;
  }

  /* ── Payment Mode details row ────────────────────────── */
  .payment-mode-row {
    position: relative;
    z-index: 1;
    font-size: 7.5pt;
    padding: 1.5mm 0; /* Compact padding */
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
  .footer-info-left {
    font-size: 6.5pt;
    color: #64748b;
    line-height: 1.45;
    text-align: left;
  }
  .footer-info-right {
    font-size: 6.5pt;
    color: #64748b;
    line-height: 1.45;
    text-align: right;
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
    font-size: 7.2pt;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2.5px;
    padding: 2.5mm 4mm;
    border-radius: 0 0 4px 4px;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    width: 100%;
    text-align: center;
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

export function buildPageHtml(gridHtml: string, title: string, layout: string): string {
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
