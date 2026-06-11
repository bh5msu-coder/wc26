// Prize money — data-driven from pool.economics (default split 60/25/10/5).
export function pot(pool) {
  return pool.economics.entryFee * pool.meta.managerCount;
}

/**
 * Map the payout split onto the current standings + group-stage leader.
 * Rounds each share; the largest share absorbs any rounding remainder so Σ === pot.
 */
export function computePayouts(pool, standings, groupLeader) {
  const total = pot(pool);
  const rows = pool.economics.payoutSplit.map((s) => {
    const amount = Math.round(total * s.pct);
    let managerId = null, name = "—";
    if (s.place === "groupLeader") {
      managerId = groupLeader?.id ?? null;
      name = groupLeader?.name ?? "—";
    } else {
      const row = standings[s.place - 1];
      managerId = row?.id ?? null;
      name = row?.name ?? "—";
    }
    return { place: s.place, label: s.label, pct: s.pct, amount, managerId, name };
  });
  // reconcile rounding into the biggest share
  const sum = rows.reduce((a, r) => a + r.amount, 0);
  if (sum !== total && rows.length) {
    const top = rows.reduce((a, b) => (b.amount > a.amount ? b : a), rows[0]);
    top.amount += total - sum;
  }
  return rows;
}
