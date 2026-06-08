import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config. Contains NO database / Node-only code so it can be
 * imported by middleware (which runs on the Edge runtime). The Prisma adapter
 * and the Credentials provider live in auth.ts, which only runs in Node.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [], // real providers are attached in auth.ts
  callbacks: {
    jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
    // Gate /pools/** behind a valid session. Returning false sends the user
    // to pages.signIn with a callbackUrl automatically.
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = request.nextUrl.pathname.startsWith("/pools");
      if (isProtected) return isLoggedIn;
      return true;
    },
  },
} satisfies NextAuthConfig;
