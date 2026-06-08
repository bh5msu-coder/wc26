import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { NATIONS, FIXTURES, PLAYERS, DRAFT_PICKS, POOL } from "./seed-data";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

// Password applied to every seeded account. Provide your own via the
// SEED_PASSWORD env var; otherwise a random one is generated and printed
// once at the end of the seed so nothing secret lives in the repo.
const PROVIDED_PASSWORD = process.env.SEED_PASSWORD?.trim();
const SEED_PASSWORD = PROVIDED_PASSWORD || randomBytes(12).toString("base64url");

async function main() {
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
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const userByHandle: Record<string, string> = {};
  for (const p of PLAYERS) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: { name: p.full },
      create: { email: p.email, name: p.full, passwordHash },
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
  console.log(`  Sign in as any of: ${PLAYERS.map((p) => p.email).join(", ")}`);
  if (PROVIDED_PASSWORD) {
    console.log(`  Password: (from SEED_PASSWORD env var)`);
  } else {
    console.log(`  Generated password (save this — set SEED_PASSWORD to choose your own): ${SEED_PASSWORD}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
