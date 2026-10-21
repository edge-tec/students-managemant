#!/usr/bin/env node
/**
 * Production-Grade Secure Administrator Provisioning Script
 * 
 * Usage:
 *   node scripts/provision-admin.mjs --email="admin@edubd.ac" --name="System Administrator" --password="StrongPassword123!"
 * 
 * Or pass via environment variables:
 *   ADMIN_EMAIL="admin@edubd.ac" ADMIN_NAME="System Administrator" ADMIN_PASSWORD="StrongPassword123!" node scripts/provision-admin.mjs
 * 
 * Flags:
 *   --reset-password   Forces password update if administrator account already exists.
 */

import { PrismaClient, UserRoleType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    email: process.env.ADMIN_EMAIL || "",
    name: process.env.ADMIN_NAME || "",
    password: process.env.ADMIN_PASSWORD || "",
    resetPassword: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--email=")) {
      params.email = arg.split("=")[1]?.trim();
    } else if (arg.startsWith("--name=")) {
      params.name = arg.split("=")[1]?.trim();
    } else if (arg.startsWith("--password=")) {
      params.password = arg.split("=")[1]?.trim();
    } else if (arg === "--reset-password") {
      params.resetPassword = true;
    }
  }

  return params;
}

function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("Password must contain both letters and numbers.");
  }
}

async function main() {
  const { email, name, password, resetPassword } = parseArgs();

  if (!email || !password) {
    console.error("❌ Error: Administrator email and password are required.");
    console.error("Usage: node scripts/provision-admin.mjs --email=\"admin@edubd.ac\" --name=\"Admin Name\" --password=\"SecurePassword123!\"");
    process.exit(1);
  }

  validatePasswordStrength(password);

  const normalizedEmail = email.toLowerCase().trim();
  const fullName = name ? name.trim() : "System Administrator";

  console.log(`🔐 Provisioning administrator account for: ${normalizedEmail}...`);

  // Ensure roles exist in DB
  const superAdminRole = await prisma.role.upsert({
    where: { name: UserRoleType.SUPER_ADMIN },
    update: {},
    create: { name: UserRoleType.SUPER_ADMIN, description: "Super Administrator with full platform authority" },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: UserRoleType.ADMIN },
    update: {},
    create: { name: UserRoleType.ADMIN, description: "Platform Administrator" },
  });

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { userRoles: true },
  });

  let userId;

  if (existingUser) {
    console.log("ℹ️ User account already exists. Verifying administrative roles...");
    userId = existingUser.id;

    // Reactivate account if it was deactivated
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        ...(resetPassword ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
    });

    if (resetPassword) {
      console.log("✓ Password updated via --reset-password flag.");
    } else {
      console.log("✓ Existing password retained intact.");
    }
  } else {
    // Create new administrator account
    const passwordHash = await bcrypt.hash(password, 10);
    const createdUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        fullName,
        passwordHash,
        isActive: true,
        isVerified: true,
        preferredLang: "bn",
      },
    });
    userId = createdUser.id;
    console.log("✓ New user record created.");
  }

  // Ensure both SUPER_ADMIN and ADMIN roles are assigned
  for (const role of [superAdminRole, adminRole]) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId,
        roleId: role.id,
      },
    });
  }

  // Record audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: "ADMIN_BOOTSTRAP_PROVISIONED",
      resource: "User",
      resourceId: userId,
      detailsJson: JSON.stringify({
        email: normalizedEmail,
        rolesAssigned: ["SUPER_ADMIN", "ADMIN"],
        passwordReset: resetPassword,
        timestamp: new Date().toISOString(),
      }),
    },
  });

  console.log("✅ Administrator provisioned successfully with [SUPER_ADMIN, ADMIN] privileges!");
  console.log("Audit log recorded: ADMIN_BOOTSTRAP_PROVISIONED");
}

main()
  .catch((err) => {
    console.error("❌ Provisioning failed:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
