import { NextRequest, NextResponse } from "next/server";

/**
 * API Route: /api/whatsapp/fee-reminder
 * 
 * Sends fee installment reminder message to student/parent via RHAI Tech WABA Gateway.
 * Template: fee_installment_reminder (APPROVED / UTILITY / en)
 * Parameters:
 *   {{1}} / variableKey1: Student Name
 *   {{2}} / variableKey2: Installment No.
 *   {{3}} / variableKey3: Due Date
 *   {{4}} / variableKey4: Installment Amount
 *   {{5}} / variableKey5: Paid Amount
 *   {{6}} / variableKey6: Pending Amount
 *   {{7}} / variableKey7: Total Paid
 *   {{8}} / variableKey8: Total Pending
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      phone,
      studentName,
      installmentNo,
      dueDate,
      installmentAmount,
      paidAmount,
      pendingAmount,
      totalPaid,
      totalPending,
      invoiceId,
    } = body;

    // Validate phone
    if (!phone) {
      return NextResponse.json(
        { success: false, message: "Phone number is required." },
        { status: 400 }
      );
    }

    // Format phone: strip all non-digits, ensure 91 prefix for 10-digit Indian numbers
    let cleanedPhone = String(phone).replace(/\D/g, "");
    if (cleanedPhone.length === 10) {
      cleanedPhone = `91${cleanedPhone}`;
    }

    if (cleanedPhone.length < 10) {
      return NextResponse.json(
        { success: false, message: `Invalid phone number: ${phone}` },
        { status: 400 }
      );
    }

    // ── Method 1: Express Backend Proxy (if available) ────────
    const backendBase = process.env.NEXT_PUBLIC_API_URL;
    if (backendBase && !backendBase.includes("vidyaniketanacadmy.rhaitech.online")) {
      try {
        const backendRes = await fetch(`${backendBase.replace(/\/+$/, "")}/whatsapp/fee-reminder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: cleanedPhone,
            template_id: "fee_installment_reminder",
            template_name: "fee_installment_reminder",
            language: "en",
            studentName,
            installmentNo,
            dueDate,
            installmentAmount,
            paidAmount,
            pendingAmount,
            totalPaid,
            totalPending,
            invoiceId,
            send_vars: body.send_vars ?? true,
          }),
        });

        const backendJson = await backendRes.json().catch(() => null);
        if (backendRes.ok && backendJson?.success) {
          return NextResponse.json({
            success: true,
            provider: "express_backend",
            message: backendJson.message || "Fee reminder sent via backend service!",
            data: backendJson,
          });
        }
      } catch (backendErr: any) {
        console.warn("Backend proxy fetch failed, falling back to direct gateway:", backendErr.message);
      }
    }

    // ── Method 2: Direct RHAI Tech WABA Gateway ────────
    const appkey = process.env.WHATSAPP_APP_KEY || "041f8573-314b-4c5c-9e2d-a23bbf2aa36b";
    const authkey = process.env.WHATSAPP_AUTH_KEY || "u7KopotuDzX0HVJ3bgI5c7WQjdEZGo0Sinp8zFf80kL7Rpe1HW";
    const apiUrl = process.env.WHATSAPP_API_URL || "https://api.rhaitech.online/api/create-message";
    const templateId = "fee_installment_reminder";
    const language = "en";

    const formData = new FormData();
    formData.append("appkey", appkey);
    formData.append("authkey", authkey);
    formData.append("to", cleanedPhone);
    formData.append("template_id", templateId);
    formData.append("language", language);

    // Format all 8 variables for {{1}} through {{8}}
    formData.append("variables[{variableKey1}]", String(studentName || "विद्यार्थी"));
    formData.append("variables[{variableKey2}]", String(installmentNo || "1"));
    formData.append("variables[{variableKey3}]", String(dueDate || ""));
    formData.append("variables[{variableKey4}]", String(installmentAmount || "0"));
    formData.append("variables[{variableKey5}]", String(paidAmount || "0"));
    formData.append("variables[{variableKey6}]", String(pendingAmount || "0"));
    formData.append("variables[{variableKey7}]", String(totalPaid || "0"));
    formData.append("variables[{variableKey8}]", String(totalPending || "0"));

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
      message: "WhatsApp fee reminder sent successfully via RHAI Tech API!",
      to: cleanedPhone,
      data: apiData,
    });
  } catch (error: any) {
    console.error("Fee reminder route error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
