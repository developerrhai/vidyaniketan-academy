import { NextRequest, NextResponse } from "next/server";

/**
 * API Route: /api/whatsapp/fee-reminder
 * 
 * Supports:
 * 1. Meta WhatsApp Business Cloud API (graph.facebook.com)
 *    Template: fee_installment_reminder (UTILITY / en)
 *    Parameters: [studentName, installmentNo, dueDate, installmentAmount, paidAmount, pendingAmount, totalPaid, totalPending]
 * 2. Express Backend Proxy (NEXT_PUBLIC_API_URL/whatsapp/fee-reminder)
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
      wabaConfig,
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

    // Check for Meta WhatsApp Cloud API credentials
    // 1. From request body (user-configured in UI)
    // 2. From environment variables
    const token =
      wabaConfig?.token ||
      process.env.WHATSAPP_CLOUD_API_TOKEN ||
      process.env.WABA_TOKEN ||
      process.env.WHATSAPP_TOKEN;

    const phoneNumberId =
      wabaConfig?.phoneNumberId ||
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      process.env.WABA_PHONE_NUMBER_ID;

    // ── Method 1: Meta WhatsApp Cloud API ───────────────────────────────
    if (token && phoneNumberId) {
      try {
        const metaUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

        const metaPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanedPhone,
          type: "template",
          template: {
            name: "fee_installment_reminder",
            language: {
              code: "en",
            },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: String(studentName || "-") },
                  { type: "text", text: String(installmentNo || "1") },
                  { type: "text", text: String(dueDate || "-") },
                  { type: "text", text: String(installmentAmount || "0") },
                  { type: "text", text: String(paidAmount || "0") },
                  { type: "text", text: String(pendingAmount || "0") },
                  { type: "text", text: String(totalPaid || "0") },
                  { type: "text", text: String(totalPending || "0") },
                ],
              },
            ],
          },
        };

        const metaRes = await fetch(metaUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(metaPayload),
        });

        const metaJson = await metaRes.json();

        if (metaRes.ok && metaJson.messages) {
          return NextResponse.json({
            success: true,
            provider: "meta_cloud_api",
            messageId: metaJson.messages[0]?.id,
            message: `Fee reminder sent successfully via WABA API to ${cleanedPhone}!`,
          });
        }

        const errMsg =
          metaJson?.error?.message ||
          metaJson?.error?.error_user_msg ||
          "Meta WABA API rejected the message.";

        return NextResponse.json(
          {
            success: false,
            provider: "meta_cloud_api",
            message: errMsg,
            errorDetails: metaJson?.error,
          },
          { status: metaRes.status >= 400 && metaRes.status < 500 ? 400 : 502 }
        );
      } catch (metaErr: any) {
        console.error("Meta WABA API fetch error:", metaErr);
        return NextResponse.json(
          {
            success: false,
            message: metaErr?.message || "Error contacting Meta Cloud API server.",
          },
          { status: 502 }
        );
      }
    }

    // ── Method 2: Express Backend Proxy ──────────────────────────────────
    const backendBase = process.env.NEXT_PUBLIC_API_URL;
    if (backendBase) {
      try {
        const backendRes = await fetch(`${backendBase}/whatsapp/fee-reminder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: cleanedPhone,
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
      } catch {
        // Express backend route not available
      }
    }

    // ── Unconfigured Notice ─────────────────────────────────────────────
    return NextResponse.json(
      {
        success: false,
        unconfigured: true,
        message:
          "Meta WABA credentials not configured. Please enter your Meta Phone Number ID and Access Token in Settings, or use the direct WhatsApp Web send button.",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Fee reminder route error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
