import { PaymentMethod, PaymentStatus } from "@prisma/client";

export interface PaymentInitiateParams {
  orderId: string;
  orderNumber: string;
  amountBdt: number;
  studentEmail: string;
  studentName: string;
  callbackUrl: string;
}

export interface PaymentInitiateResult {
  paymentUrl: string;
  gatewayTxId: string;
  status: PaymentStatus;
  message?: string;
}

export interface PaymentVerifyParams {
  gatewayTxId: string;
  orderNumber: string;
  rawPayload?: Record<string, unknown>;
}

export interface PaymentVerifyResult {
  isVerified: boolean;
  gatewayTxId: string;
  amountBdt: number;
  status: PaymentStatus;
  notes?: string;
}

export interface PaymentGatewayAdapter {
  method: PaymentMethod;
  initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult>;
  verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult>;
}
