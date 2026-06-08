"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

const COLORS = ["#C6FF3A", "#2E7CF6", "#FF8A3D", "#34E29B", "#E45CFF", "#FFC83D", "#7C3AED", "#FF5C72"];

function firstName(name?: string | null, email?: string | null) {
  if (name) return name.split(/\s+/)[0];
  if (email) return email.split("@")[0];
  return "Manager";
}

export async function createPool(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim() || "My Pool";
  const user = await prisma.user.findUnique({ where: { id: userId } });

  const pool = await prisma.pool.create({
    data: {
      name,
      commissionerId: userId,
      memberships: {
        create: {
          userId,
          displayName: firstName(user?.name, user?.email),
          color: COLORS[0],
          role: "COMMISSIONER",
        },
      },
    },
  });

  redirect(`/pools/${pool.id}`);
}

export async function joinPool(formData: FormData) {
  const userId = await requireUserId();
  const code = String(formData.get("inviteCode") ?? "").trim();
  if (!code) redirect("/pools?error=missing-code");

  const pool = await prisma.pool.findUnique({
    where: { inviteCode: code },
    include: { memberships: true },
  });
  if (!pool) redirect("/pools?error=not-found");

  const existing = pool.memberships.find((m) => m.userId === userId);
  if (existing) redirect(`/pools/${pool.id}`);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  await prisma.membership.create({
    data: {
      poolId: pool.id,
      userId,
      displayName: firstName(user?.name, user?.email),
      color: COLORS[pool.memberships.length % COLORS.length],
      role: "MEMBER",
    },
  });

  redirect(`/pools/${pool.id}`);
}
