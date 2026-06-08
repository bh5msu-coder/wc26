import { PrismaClient } from "@prisma/client";
import { NATIONS, FIXTURES, PLAYERS, POOL, DRAFT_ORDER } from "./seed-data";

const prisma = new PrismaClient();

// Shared league that every seeded user belongs to, so it shows up for everyone
// on login. The commissioner handle must match a PLAYERS id.
const SHARED_POOL = { name: "Wilboi 26", commissioner: "bard" };

async function main() {
  console.log("→ Seeding tournament catalog…");
  for (const n of NATIONS) {
    await prisma.nation.upsert({
      where: { code: n.code },
      // Only refresh static facts on reseed — preserve live W/L/GF/etc. so a
      // deploy never wipes results pulled by the cron.
      update: { name: n.name, flag: n.flag, group: n.group, strength: n.strength },
      create: { ...n },
    });
  }

  // Seed the placeholder schedule only when there are no fixtures yet; once the
  // results sync owns the fixture list, leave it alone.
  if ((await prisma.fixture.count()) === 0) {
    for (const f of FIXTURES) {
      await prisma.fixture.create({ data: { ...f, events: f.events ?? undefined } });
    }
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

  // Ensure the shared "Wilboi 26" pool exists with every seeded user as a member,
  // so it appears for all accounts at login. Idempotent: reuses an existing pool
  // of the same name (preserving its commissioner) and upserts memberships.
  console.log(`→ Ensuring shared pool "${SHARED_POOL.name}"…`);
  let shared = await prisma.pool.findFirst({ where: { name: SHARED_POOL.name } });
  if (!shared) {
    const commissionerId = userByHandle[SHARED_POOL.commissioner] ?? Object.values(userByHandle)[0];
    shared = await prisma.pool.create({ data: { name: SHARED_POOL.name, commissionerId } });
  }
  const membershipByHandle: Record<string, string> = {};
  for (const p of PLAYERS) {
    const userId = userByHandle[p.id];
    const isCommish = shared.commissionerId === userId;
    const m = await prisma.membership.upsert({
      where: { poolId_userId: { poolId: shared.id, userId } },
      update: { displayName: p.name, color: p.color },
      create: {
        poolId: shared.id,
        userId,
        displayName: p.name,
        color: p.color,
        role: isCommish ? "COMMISSIONER" : "MEMBER",
      },
    });
    membershipByHandle[p.id] = m.id;
  }

  // Apply the custom draft order: a membershipId for each overall pick (1..N),
  // and set the round count to match (slots per manager).
  const slots: { pick: number; handle: string }[] = [];
  for (const [handle, picks] of Object.entries(DRAFT_ORDER)) {
    for (const pick of picks) slots.push({ pick, handle });
  }
  slots.sort((a, b) => a.pick - b.pick);
  const draftOrder = slots.map((s) => membershipByHandle[s.handle]).filter(Boolean);
  const rounds = Math.max(...Object.values(DRAFT_ORDER).map((p) => p.length));
  await prisma.pool.update({
    where: { id: shared.id },
    data: { draftOrder, rounds },
  });

  console.log(`✓ Seed complete — "${SHARED_POOL.name}" has ${PLAYERS.length} members and a ${draftOrder.length}-pick custom order.`);
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
