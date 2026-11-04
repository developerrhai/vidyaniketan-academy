import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/invoices/send-whatsapp
 * Handles receipt send requests where invoice ID is in the request body.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phone, invoice, id: bodyId, invoiceId } = body;
    const resolvedId = bodyId || invoiceId || invoice?.id;

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

    const inv = invoice || {};
    const rcpNo = inv.receipt_number
      ? `RCP-${String(inv.receipt_number).padStart(4, "0")}`
      : inv.offline_receipt_number || `INV${String(resolvedId || "").padStart(3, "0")}`;

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

    const appkey = process.env.WHATSAPP_APP_KEY || "041f8573-314b-4c5c-9e2d-a23bbf2aa36b";
    const authkey = process.env.WHATSAPP_AUTH_KEY || "u7KopotuDzX0HVJ3bgI5c7WQjdEZGo0Sinp8zFf80kL7Rpe1HW";
    const templateId = process.env.WHATSAPP_TEMPLATE_ID || "administration_department";
    const language = process.env.WHATSAPP_LANGUAGE || "en";
    const apiUrl = process.env.WHATSAPP_API_URL || "https://api.rhaitech.online/api/create-message";
    const headerImageUrl = process.env.WHATSAPP_HEADER_IMAGE_URL || "https://vidyaniketan-academy.vercel.app/receipt-banner.png";

    const formData = new FormData();
    formData.append("appkey", appkey);
    formData.append("authkey", authkey);
    formData.append("to", rawPhone);
    formData.append("template_id", templateId);
    formData.append("language", language);
    if (headerImageUrl) {
      formData.append("file", headerImageUrl);
    }

    formData.append("variables[{variableKey1}]", studentName);
    formData.append("variables[{variableKey2}]", rcpNo);
    formData.append("variables[{variableKey3}]", dateStr);
    formData.append("variables[{variableKey4}]", paid);
    formData.append("variables[{variableKey5}]", totalPaid);
    formData.append("variables[{variableKey6}]", totalPending);

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

