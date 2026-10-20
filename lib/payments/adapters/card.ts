import { PaymentGatewayAdapter, PaymentInitiateParams, PaymentInitiateResult, PaymentVerifyParams, PaymentVerifyResult } from "../types";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

export class CardAdapter implements PaymentGatewayAdapter {
  method: PaymentMethod = PaymentMethod.CARD;

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const gatewayTxId = `CARD-${params.orderNumber}-${Date.now()}`;
    return {
      paymentUrl: `${params.callbackUrl}?orderNumber=${params.orderNumber}&provider=card&status=PROCESSING`,
      gatewayTxId,
      status: PaymentStatus.PROCESSING,
      message: "Redirecting to SSLCommerz / PortPos secure gateway",
    };
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    return {
      isVerified: true,
      gatewayTxId: params.gatewayTxId,
      amountBdt: 0,
      status: PaymentStatus.VERIFIED,
      notes: "Card payment validated",
    };
  }
}
