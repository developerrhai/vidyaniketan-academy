import { BANNER_BASE64, WATERMARK_BASE64 } from "./receipt-images";
import { buildReceiptA6, buildPageHtml, ReceiptData } from "./receipt-print";
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_PATH = 'C:/Users/admin/Desktop/receipt_test.html';

const mockData: ReceiptData = {
  id: 42,
  receipt_number: "0185",
  offline_receipt_number: "2026/A-09",
  student_receipt_serial_number: 142,
  student_name: "Rahul Suresh Sharma",
  student_phone: "9876543210",
  student_standard: "10th Standard",
  student_batch: "10th Standard",
  student_branch: "Main Branch",
  amount: 5000,
  paid_amount: 3000,
  student_fee: 6000,
  student_paid_fee: 3000,
  student_school_fee: 4000,
  student_academy_fee: 2000,
  student_hostel_fee: 0,
  student_scholarship_type: "Percent",
  student_scholarship_value: 10,
  student_scholarship_amount: 600,
  scholarship_reason: "Academic Excellence Merit Scheme",
  install_date: "2026-07-05",
  transaction_type: "UPI",
  transaction_ref: "TXN9876543210UPI",
  remarks: "Part payment received. Remaining balance to be paid by next month installment.",
  generated_by: "Admin User",
  description: "Tuition Fee – 10th Std Class Science"
};

const originalCopy = buildReceiptA6(mockData, "ORIGINAL COPY");
const officeCopy = buildReceiptA6(mockData, "OFFICE COPY");

const gridHtml = `
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
`;

const title = mockData.receipt_number ? "RCP-" + String(mockData.receipt_number).padStart(4, "0") : "#" + mockData.id;
const resultHtml = buildPageHtml(gridHtml, "Receipt " + title, "full");

fs.writeFileSync(OUTPUT_PATH, resultHtml, "utf8");
console.log("Successfully generated preview HTML at " + OUTPUT_PATH);
