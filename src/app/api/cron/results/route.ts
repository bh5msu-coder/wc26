import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncResults } from "@/lib/results";

export const dynamic = "force-dynamic";

/**
 * Daily results pull, invoked by Vercel Cron (see vercel.json). When CRON_SECRET
 * is set, Vercel sends it as `Authorization: Bearer <secret>` — we require it so
 * the endpoint can't be triggered by anyone else.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await syncResults();
  revalidatePath("/", "layout");
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
