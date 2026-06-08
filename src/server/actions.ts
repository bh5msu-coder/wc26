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
