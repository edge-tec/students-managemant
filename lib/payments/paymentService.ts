import prisma from "@/lib/db/prisma";
import { PaymentMethod, PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { BkashAdapter } from "./adapters/bkash";
import { NagadAdapter } from "./adapters/nagad";
import { BankTransferAdapter } from "./adapters/bankTransfer";
import { CardAdapter } from "./adapters/card";
import { PaymentGatewayAdapter } from "./types";

export class PaymentService {
  private static getAdapter(method: PaymentMethod): PaymentGatewayAdapter {
    switch (method) {
      case PaymentMethod.BKASH:
        return new BkashAdapter();
      case PaymentMethod.NAGAD:
        return new NagadAdapter();
      case PaymentMethod.BANK_TRANSFER:
        return new BankTransferAdapter();
      case PaymentMethod.CARD:
        return new CardAdapter();
      default:
        return new BkashAdapter();
    }
  }

  static async createOrder(studentId: string, planId: string, paymentMethod: PaymentMethod) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      throw new Error("Selected subscription plan is not available");
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new Error("Student account not found");
    }

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const order = await prisma.paymentOrder.create({
      data: {
        orderNumber,
        studentId,
        planId,
        amountBdt: plan.priceBdt,
        paymentMethod,
        status: PaymentStatus.PENDING,
      },
    });

    const adapter = this.getAdapter(paymentMethod);
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/v1/payments/callback`;

    const initiateResult = await adapter.initiatePayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountBdt: order.amountBdt,
      studentEmail: student.email,
      studentName: student.fullName,
      callbackUrl,
    });

    let updatedOrder = order;
    if (initiateResult.gatewayTxId) {
      updatedOrder = await prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          providerTxId: initiateResult.gatewayTxId,
          status: initiateResult.status,
          notes: initiateResult.message,
        },
      });
    }

    return {
      order: updatedOrder,
      initiateResult,
    };
  }

  static async processCallback(orderNumber: string, gatewayTxId: string, payload?: Record<string, unknown>) {
    const order = await prisma.paymentOrder.findUnique({
      where: { orderNumber },
      include: { plan: true, student: true },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Idempotency: If already verified, do not recreate subscription
    if (order.status === PaymentStatus.VERIFIED) {
      return { success: true, alreadyProcessed: true, order };
    }

    const adapter = this.getAdapter(order.paymentMethod);
    const verifyResult = await adapter.verifyPayment({
      gatewayTxId,
      orderNumber,
      rawPayload: payload,
    });

    if (verifyResult.isVerified && verifyResult.status === PaymentStatus.VERIFIED) {
      // Execute within database transaction for data integrity
      return await prisma.$transaction(async (tx) => {
        // Record verified transaction
        await tx.paymentTransaction.create({
          data: {
            orderId: order.id,
            gateway: order.paymentMethod,
            gatewayTxId: verifyResult.gatewayTxId,
            amount: order.amountBdt,
            currency: "BDT",
            isVerified: true,
            rawCallback: payload ? JSON.stringify(payload) : null,
          },
        });

        // Update order status
        const updatedOrder = await tx.paymentOrder.update({
          where: { id: order.id },
          data: {
            status: PaymentStatus.VERIFIED,
            providerTxId: verifyResult.gatewayTxId,
          },
        });

        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + order.plan.durationDays);

        // Activate or update subscription
        await tx.subscription.create({
          data: {
            studentId: order.studentId,
            planId: order.planId,
            status: SubscriptionStatus.ACTIVE,
            startDate,
            endDate,
            orderId: order.id,
          },
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            userId: order.studentId,
            action: "SUBSCRIPTION_ACTIVATED",
            resource: "Subscription",
            detailsJson: JSON.stringify({
              orderNumber: order.orderNumber,
              planCode: order.plan.code,
              amount: order.amountBdt,
            }),
          },
        });

        return { success: true, alreadyProcessed: false, order: updatedOrder };
      });
    }

    // Mark as failed if verification failed
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: verifyResult.status,
        notes: verifyResult.notes,
      },
    });

    return { success: false, alreadyProcessed: false, status: verifyResult.status, notes: verifyResult.notes };
  }
}
