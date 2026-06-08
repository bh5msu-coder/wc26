import { PrismaClient } from "@prisma/client";
import { NATIONS, FIXTURES, PLAYERS, POOL } from "./seed-data";

const prisma = new PrismaClient();

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
  for (const p of PLAYERS) {
    await prisma.user.upsert({
      where: { email: p.email },
      update: { name: p.full },
      create: { email: p.email, name: p.full },
    });
  }

  // Remove the hard-coded demo league ("The Lads"). Only the seeded pool whose
  // commissioner is the demo account is deleted — pools that real users create
  // are left untouched. Cascades to its memberships and picks.
  const demoCommish = PLAYERS.find((p) => p.isYou);
  if (demoCommish) {
    const owner = await prisma.user.findUnique({ where: { email: demoCommish.email } });
    if (owner) {
      const removed = await prisma.pool.deleteMany({
        where: { name: POOL.name, commissionerId: owner.id },
      });
      if (removed.count) console.log(`→ Removed demo league "${POOL.name}" (${removed.count}).`);
    }
  }

  console.log("✓ Seed complete — accounts ready, no demo league.");
  console.log(`  Sign in with any of: ${PLAYERS.map((p) => p.email).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
