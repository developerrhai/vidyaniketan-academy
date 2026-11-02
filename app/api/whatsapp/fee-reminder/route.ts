import { NextRequest, NextResponse } from "next/server";

/**
 * API Route: /api/whatsapp/fee-reminder
 * 
 * Proxies fee reminder requests to the Express backend RHAI Tech WABA service.
 * Template: fee_installment_reminder (UTILITY / en)
 * Parameters: [studentName, installmentNo, dueDate, installmentAmount, paidAmount, pendingAmount, totalPaid, totalPending]
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

    // ── Method 1: Express Backend Proxy (RHAI Tech WABA Gateway) ────────
    const backendBase = process.env.NEXT_PUBLIC_API_URL || "https://vidyaniketanacadmy.rhaitech.online/api";
    if (backendBase) {
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
        if (backendJson) {
          return NextResponse.json(
            {
              success: false,
              provider: "express_backend",
              message: backendJson.message || "Backend WhatsApp API error",
              errorDetails: backendJson,
            },
            { status: backendRes.status || 400 }
          );
        }
      } catch (backendErr: any) {
        console.warn("Backend proxy fetch failed:", backendErr.message);
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Could not reach WhatsApp backend service. Please check backend server status.",
      },
      { status: 502 }
    );
  } catch (error: any) {
    console.error("Fee reminder route error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
