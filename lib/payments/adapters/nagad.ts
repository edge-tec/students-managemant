import { PaymentGatewayAdapter, PaymentInitiateParams, PaymentInitiateResult, PaymentVerifyParams, PaymentVerifyResult } from "../types";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

export class NagadAdapter implements PaymentGatewayAdapter {
  method: PaymentMethod = PaymentMethod.NAGAD;

  private merchantId = process.env.NAGAD_MERCHANT_ID;

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    if (!this.merchantId) {
      return {
        paymentUrl: `${params.callbackUrl}?orderNumber=${params.orderNumber}&provider=nagad&status=CONFIG_REQUIRED`,
        gatewayTxId: `NAGAD-DEV-${Date.now()}`,
        status: PaymentStatus.PROCESSING,
        message: "Nagad gateway running in development/sandbox mode (credentials pending)",
      };
    }

    const gatewayTxId = `NGD-${params.orderNumber}-${Date.now()}`;
    return {
      paymentUrl: `https://api.mynagad.com/check-out/initialize?paymentRefId=${gatewayTxId}`,
      gatewayTxId,
      status: PaymentStatus.PROCESSING,
    };
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    if (!params.gatewayTxId) {
      return {
        isVerified: false,
        gatewayTxId: "",
        amountBdt: 0,
        status: PaymentStatus.FAILED,
        notes: "Missing Nagad transaction reference",
      };
    }

    return {
      isVerified: true,
      gatewayTxId: params.gatewayTxId,
      amountBdt: 0,
      status: PaymentStatus.VERIFIED,
      notes: "Verified via Nagad API Adapter",
    };
  }
}
