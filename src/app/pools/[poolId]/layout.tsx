import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { getPoolView } from "@/server/pools";
import { AppNav } from "@/components/nav/AppNav";

export default async function PoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { poolId: string };
}) {
  const userId = await requireUserId();
  const pool = await getPoolView(params.poolId, userId);
  if (!pool) notFound();

  const you = pool.managers.find((m) => m.isYou) ?? pool.managers[0];

  return (
    <AppNav
      poolId={pool.id}
      poolName={pool.name}
      stageLabel={pool.stageLabel}
      you={{ name: you?.name ?? "You", color: you?.color ?? "#C6FF3A" }}
    >
      {children}
    </AppNav>
  );
}
