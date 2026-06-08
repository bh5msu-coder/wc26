import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const userId = await getUserId();
  if (userId) redirect("/pools");

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
