import { PrismaClient } from "@prisma/client";
import { NATIONS, FIXTURES, PLAYERS, DRAFT_PICKS, POOL } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  // Safe to run on every deploy: if the database already has data, do nothing
  // (so we never wipe a pool real members have joined). Set SEED_FORCE=1 to
  // reseed the demo pool from scratch.
  const force = process.env.SEED_FORCE === "1";
  const existingPools = await prisma.pool.count();
  if (existingPools > 0 && !force) {
    console.log(`✓ Seed skipped — database already has ${existingPools} pool(s). Set SEED_FORCE=1 to reseed.`);
    return;
  }

  console.log("→ Seeding tournament catalog…");
  for (const n of NATIONS) {
    await prisma.nation.upsert({
      where: { code: n.code },
      update: { ...n },
      create: { ...n },
    });
  }

  for (const f of FIXTURES) {
    await prisma.fixture.upsert({
      where: { id: f.id },
      update: { ...f, events: f.events ?? undefined },
      create: { ...f, events: f.events ?? undefined },
    });
  }

  console.log("→ Seeding users…");
  const userByHandle: Record<string, string> = {};
  for (const p of PLAYERS) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: { name: p.full },
      create: { email: p.email, name: p.full },
    });
    userByHandle[p.id] = user.id;
  }

  console.log("→ Seeding pool + memberships…");
  const commissionerId = userByHandle["tom"];
  // Idempotent-ish: clear an existing demo pool of the same name first.
  await prisma.pool.deleteMany({ where: { name: POOL.name, commissionerId } });
  const pool = await prisma.pool.create({
    data: {
      name: POOL.name,
      season: POOL.season,
      stageLabel: POOL.stageLabel,
      rounds: 6,
      commissionerId,
    },
  });

  const membershipByHandle: Record<string, string> = {};
  for (const p of PLAYERS) {
    const m = await prisma.membership.create({
      data: {
        poolId: pool.id,
        userId: userByHandle[p.id],
        displayName: p.name,
        color: p.color,
        role: p.isYou ? "COMMISSIONER" : "MEMBER",
      },
    });
    membershipByHandle[p.id] = m.id;
  }

  console.log("→ Seeding draft picks…");
  const counts: Record<string, number> = {};
  for (let i = 0; i < DRAFT_PICKS.length; i++) {
    const [handle, code] = DRAFT_PICKS[i];
    counts[handle] = (counts[handle] ?? 0) + 1;
    await prisma.pick.create({
      data: {
        poolId: pool.id,
        membershipId: membershipByHandle[handle],
        nationCode: code,
        round: counts[handle],
        pickNumber: i + 1,
      },
    });
  }

  console.log(`✓ Seed complete. Pool "${pool.name}" with invite code ${pool.inviteCode}`);
  console.log(`  Sign in (no password — just the email) as any of: ${PLAYERS.map((p) => p.email).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
