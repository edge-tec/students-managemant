import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { PaymentService } from "@/lib/payments/paymentService";
import { PaymentMethod, PaymentStatus, SubscriptionStatus } from "@prisma/client";

describe("Payments & Subscription Integration Tests", () => {
  let testStudentId: string;
  let testPlanId: string;
  let createdOrderNumber: string;

  beforeAll(async () => {
    const student = await prisma.user.findFirst({
      where: { email: "student@edubd.ac" },
    });
    if (!student) throw new Error("Seed student not found");
    testStudentId = student.id;

    const plan = await prisma.subscriptionPlan.findFirst({
      where: { code: "HSC_PREMIUM" },
    });
    if (!plan) throw new Error("HSC_PREMIUM plan not found");
    testPlanId = plan.id;
  });

  afterAll(async () => {
    if (createdOrderNumber) {
      const order = await prisma.paymentOrder.findUnique({
        where: { orderNumber: createdOrderNumber },
      });
      if (order) {
        await prisma.subscription.deleteMany({ where: { orderId: order.id } });
        await prisma.paymentTransaction.deleteMany({ where: { orderId: order.id } });
        await prisma.paymentOrder.delete({ where: { id: order.id } });
      }
    }
  });

  it("should create a server-side order with bKash adapter initialization", async () => {
    const { order, initiateResult } = await PaymentService.createOrder(
      testStudentId,
      testPlanId,
      PaymentMethod.BKASH
    );

    expect(order).toBeDefined();
    expect(order.orderNumber.startsWith("ORD-")).toBe(true);
    expect(order.amountBdt).toBe(149);
    expect(order.status).toBe(PaymentStatus.PROCESSING);
    expect(initiateResult.gatewayTxId).toBeDefined();

    createdOrderNumber = order.orderNumber;
  });

  it("should verify payment callback idempotently and activate student subscription", async () => {
    const txId = `TEST-TX-${Date.now()}`;

    // 1st Callback
    const result1 = await PaymentService.processCallback(createdOrderNumber, txId, {
      simulated: true,
    });

    expect(result1.success).toBe(true);
    expect(result1.order?.status).toBe(PaymentStatus.VERIFIED);

    // Verify database subscription record
    const sub = await prisma.subscription.findFirst({
      where: { studentId: testStudentId, status: SubscriptionStatus.ACTIVE },
    });
    expect(sub).toBeDefined();
    expect(new Date(sub!.endDate).getTime()).toBeGreaterThan(Date.now());

    // 2nd Callback (Idempotency check)
    const result2 = await PaymentService.processCallback(createdOrderNumber, txId, {
      simulated: true,
    });

    expect(result2.success).toBe(true);
    expect(result2.alreadyProcessed).toBe(true);
  });
});
