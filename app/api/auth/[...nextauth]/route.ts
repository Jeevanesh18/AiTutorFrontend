import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"
import type { User as NextAuthUser } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user }: { user: NextAuthUser }) {
      try {
        const res = await fetch("http://localhost:8080/api/users/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            google_uid: user.id,
            email: user.email,
            name: user.name,
            avatar_url: user.image,
          }),
        });

        if (!res.ok) {
          console.error("Backend returned error:", await res.text());
          return false;
        }
        // Parse backend response to get the actual user ID
    const backendUser = await res.json();
    // Attach backend ID to user object for JWT callback
    (user as any).backendId = backendUser.id;
      } catch (e) {
        console.error("Backend user registration failed:", e);
        return false;
      }
      return true;
    },

    // ⭐ Save DB user.id into JWT token
   async jwt({ token, user }) {
  if (user) {
    token.id = (user as any).backendId; // Save backend-generated ID
  }
  return token;
},

    // ⭐ Make id available in session.user
   async session({ session, token }) {
  if (session.user) {
    session.user.id = token.id as string; // now this is backend user ID
  }
  return session;
}

  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
