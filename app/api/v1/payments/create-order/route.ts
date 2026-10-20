import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { CreatePaymentOrderSchema } from "@/lib/validation/schemas";
import { PaymentService } from "@/lib/payments/paymentService";
import { PaymentMethod } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in to upgrade or subscribe" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreatePaymentOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const { planId, paymentMethod } = parsed.data;

    const result = await PaymentService.createOrder(
      user.id,
      planId,
      paymentMethod as PaymentMethod
    );

    return NextResponse.json({
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      amountBdt: result.order.amountBdt,
      paymentUrl: result.initiateResult.paymentUrl,
      gatewayTxId: result.initiateResult.gatewayTxId,
      status: result.initiateResult.status,
      message: result.initiateResult.message,
    }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Create payment order error:", err);
    return NextResponse.json({ error: err.message || "Failed to create payment order" }, { status: 400 });
  }
}
