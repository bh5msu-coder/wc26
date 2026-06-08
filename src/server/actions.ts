"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

export type ScoringInput = {
  winPts: number; drawPts: number; goalPts: number; csPts: number; koPts: number; champPts: number;
};

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
};

/** Commissioner-only: update this pool's scoring weights. */
export async function updateScoring(poolId: string, input: ScoringInput) {
  const userId = await requireUserId();

  const membership = await prisma.membership.findFirst({
    where: { poolId, userId },
  });
  if (!membership || membership.role !== "COMMISSIONER") {
    throw new Error("Only the commissioner can change scoring.");
  }

  await prisma.pool.update({
    where: { id: poolId },
    data: {
      winPts: clamp(input.winPts, 0, 5, 3),
      drawPts: clamp(input.drawPts, 0, 3, 1),
      goalPts: clamp(input.goalPts, 0, 3, 1),
      csPts: clamp(input.csPts, 0, 3, 1),
      koPts: clamp(input.koPts, 0, 3, 1),
      champPts: clamp(input.champPts, 0, 10, 1),
    },
  });

  // recompute everything that depends on scoring
  revalidatePath(`/pools/${poolId}`, "layout");
}

/** Draft a nation for the requesting user — only valid when they're on the clock. */
export async function draftNation(poolId: string, nationCode: string) {
  const userId = await requireUserId();

  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: { memberships: true, picks: true },
  });
  if (!pool) throw new Error("Pool not found.");

  const me = pool.memberships.find((m) => m.userId === userId);
  if (!me) throw new Error("You're not a member of this pool.");

  const order = pool.draftOrder;
  const picksMade = pool.picks.length;
  if (order.length === 0) throw new Error("No draft order is set for this pool.");
  if (picksMade >= order.length) throw new Error("The draft is already complete.");
  if (order[picksMade] !== me.id) throw new Error("It's not your turn to pick.");

  const code = String(nationCode).toUpperCase().trim();
  if (pool.picks.some((p) => p.nationCode === code)) {
    throw new Error("That nation has already been drafted.");
  }
  const nation = await prisma.nation.findUnique({ where: { code } });
  if (!nation) throw new Error("Unknown nation.");

  const round = pool.picks.filter((p) => p.membershipId === me.id).length + 1;

  await prisma.pick.create({
    data: { poolId, membershipId: me.id, nationCode: code, round, pickNumber: picksMade + 1 },
  });

  revalidatePath(`/pools/${poolId}`, "layout");
}
