import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/lib/payments/paymentService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber");
    const gatewayTxId = searchParams.get("paymentID") || searchParams.get("gatewayTxId") || `TX-${orderNumber}`;

    if (!orderNumber) {
      return NextResponse.json({ error: "Missing orderNumber" }, { status: 400 });
    }

    const result = await PaymentService.processCallback(orderNumber, gatewayTxId, {
      query: Object.fromEntries(searchParams.entries()),
    });

    if (result.success) {
      return NextResponse.redirect(
        new URL(`/dashboard?payment=success&order=${orderNumber}`, req.url)
      );
    } else {
      return NextResponse.redirect(
        new URL(`/pricing?payment=failed&order=${orderNumber}`, req.url)
      );
    }
  } catch (error) {
    console.error("Payment callback error:", error);
    return NextResponse.redirect(new URL("/pricing?payment=error", req.url));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderNumber, gatewayTxId } = body;

    if (!orderNumber || !gatewayTxId) {
      return NextResponse.json({ error: "orderNumber and gatewayTxId are required" }, { status: 400 });
    }

    const result = await PaymentService.processCallback(orderNumber, gatewayTxId, body);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Payment webhook error:", err);
    return NextResponse.json({ error: err.message || "Failed to process callback" }, { status: 400 });
  }
}
