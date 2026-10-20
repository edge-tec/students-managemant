import { PaymentGatewayAdapter, PaymentInitiateParams, PaymentInitiateResult, PaymentVerifyParams, PaymentVerifyResult } from "../types";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

export class BankTransferAdapter implements PaymentGatewayAdapter {
  method: PaymentMethod = PaymentMethod.BANK_TRANSFER;

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const gatewayTxId = `BANK-${params.orderNumber}`;
    return {
      paymentUrl: `${params.callbackUrl}?orderNumber=${params.orderNumber}&provider=bank_transfer&status=PENDING_APPROVAL`,
      gatewayTxId,
      status: PaymentStatus.PENDING,
      message: "Please deposit to EduBD Bank Account (Sonali/City Bank) and upload your deposit slip or transaction reference.",
    };
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    // Bank transfer requires staff approval workflow
    return {
      isVerified: false,
      gatewayTxId: params.gatewayTxId,
      amountBdt: 0,
      status: PaymentStatus.PENDING,
      notes: "Awaiting administrative verification of bank slip",
    };
  }
}
