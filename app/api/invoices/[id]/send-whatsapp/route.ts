import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/invoices/[id]/send-whatsapp
 * 
 * Sends WhatsApp payment receipt confirmation to student/parent via RHAI Tech WABA API.
 * Template: administration_department (UTILITY / en)
 * Variables:
 *   variableKey1: Student Name
 *   variableKey2: Receipt No.
 *   variableKey3: Payment Date
 *   variableKey4: Paid Amount
 *   variableKey5: Total Paid
 *   variableKey6: Total Pending
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const invoiceId = resolvedParams?.id;
    const body = await request.json().catch(() => ({}));
    const { phone, invoice } = body;

    // 1. Determine & normalize phone number
    let rawPhone = String(phone || invoice?.student_phone || invoice?.father_phone || "").replace(/\D/g, "");
    if (!rawPhone) {
      return NextResponse.json(
        { success: false, message: "Valid student phone number is required." },
        { status: 400 }
      );
    }
    if (rawPhone.length === 10) {
      rawPhone = "91" + rawPhone;
    }

    if (rawPhone.length < 10) {
      return NextResponse.json(
        { success: false, message: `Invalid phone number: ${phone}` },
        { status: 400 }
      );
    }

    // 2. Format receipt fields
    const inv = invoice || {};
    const rcpNo = inv.receipt_number
      ? `RCP-${String(inv.receipt_number).padStart(4, "0")}`
      : inv.offline_receipt_number || `INV${String(invoiceId || "").padStart(3, "0")}`;

    const rawDate = inv.install_date || inv.created_at || new Date().toISOString();
    const d = new Date(rawDate);
    const dateStr = !isNaN(d.getTime())
      ? `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
      : String(rawDate);

    const paid = Number(inv.paid_amount || 0).toLocaleString("en-IN");
    const totalPaid = Number(inv.student_paid_fee ?? inv.paid_amount ?? 0).toLocaleString("en-IN");
    const studentTotalFee = Number(inv.student_fee ?? inv.amount ?? 0);
    const studentTotalPaid = Number(inv.student_paid_fee ?? inv.paid_amount ?? 0);
    const totalPending = Number(Math.max(0, studentTotalFee - studentTotalPaid)).toLocaleString("en-IN");
    const studentName = String(inv.student_name || "विद्यार्थी");

    // 3. Credentials & Gateway Configuration
    const appkey = process.env.WHATSAPP_APP_KEY || "041f8573-314b-4c5c-9e2d-a23bbf2aa36b";
    const authkey = process.env.WHATSAPP_AUTH_KEY || "u7KopotuDzX0HVJ3bgI5c7WQjdEZGo0Sinp8zFf80kL7Rpe1HW";
    const templateId = process.env.WHATSAPP_TEMPLATE_ID || "administration_department";
    const language = process.env.WHATSAPP_LANGUAGE || "en";
    const apiUrl = process.env.WHATSAPP_API_URL || "https://api.rhaitech.online/api/create-message";
    const headerImageUrl = process.env.WHATSAPP_HEADER_IMAGE_URL || "https://vidyaniketan-academy.vercel.app/receipt-banner.png";

    // 4. Construct form-data matching RHAI Tech API specification
    const formData = new FormData();
    formData.append("appkey", appkey);
    formData.append("authkey", authkey);
    formData.append("to", rawPhone);
    formData.append("template_id", templateId);
    formData.append("language", language);
    if (headerImageUrl) {
      formData.append("file", headerImageUrl);
    }

    // 6 receipt variables for administration_department
    formData.append("variables[{variableKey1}]", studentName);
    formData.append("variables[{variableKey2}]", rcpNo);
    formData.append("variables[{variableKey3}]", dateStr);
    formData.append("variables[{variableKey4}]", paid);
    formData.append("variables[{variableKey5}]", totalPaid);
    formData.append("variables[{variableKey6}]", totalPending);

    // 5. Send to RHAI Tech WABA Gateway
    const apiRes = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });

    const apiData = await apiRes.json().catch(() => null);

    if (!apiRes.ok || (apiData && (apiData.status === false || apiData.status === "error"))) {
      const errorMsg = apiData?.message || apiData?.error || `RHAI Tech API Error (HTTP ${apiRes.status})`;
      return NextResponse.json(
        { success: false, message: errorMsg, details: apiData },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "WhatsApp payment confirmation sent successfully via RHAI Tech API!",
      to: rawPhone,
      data: apiData,
    });
  } catch (error: any) {
    console.error("send-whatsapp route error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

