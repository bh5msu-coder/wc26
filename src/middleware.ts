import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe middleware: uses the no-DB config so Prisma never loads on the Edge.
// The `authorized` callback in auth.config.ts decides what is protected.
export default NextAuth(authConfig).auth;

export const config = {
  // run on everything except next internals + static files
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
