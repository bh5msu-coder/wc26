import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="display" style={{ fontSize: 80, color: "var(--accent)" }}>404</div>
      <h1 className="display mt-2" style={{ fontSize: 28 }}>Off the pitch</h1>
      <p className="mt-2 max-w-[40ch] text-[14px]" style={{ color: "var(--dim)" }}>
        That pool doesn&apos;t exist, or you&apos;re not a member of it.
      </p>
      <Link href="/pools" className="mt-6 inline-flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-extrabold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
        <Icon name="trophy" size={16} color="var(--accent-ink)" /> Back to your pools
      </Link>
    </div>
  );
}
