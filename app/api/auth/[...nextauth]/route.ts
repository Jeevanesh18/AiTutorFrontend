import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    // 1️⃣ Verify Google login with backend & Get Custom Token
    // We add 'user' to the destructuring here
    async signIn({ account, user }) {
      if (!account?.id_token) return false;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: account.id_token }),
        });

        if (!res.ok) {
       //   console.error("Backend authentication failed");
          return false;
        }

        const backendData = await res.json(); // Expecting: { userId: 1, accessToken: "..." }

        // Attach backend data to the 'user' object temporarily.
        // This object is passed to the 'jwt' callback immediately after.
        (user as any).backendId = backendData.userId;
        (user as any).backendAccessToken = backendData.accessToken; 

        return true;
      } catch (error) {
   //     console.error("Error connecting to backend:", error);
        return false;
      }
    },

    // 2️⃣ Persist Backend Token to NextAuth JWT
    async jwt({ token, user }) {
      // The 'user' argument is only available the first time the user signs in.
      if (user) {
        token.userId = (user as any).backendId;
        token.accessToken = (user as any).backendAccessToken; // Persist the Java JWT
      }
      return token;
    },

    // 3️⃣ Expose JWT to frontend session
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string;
        
        // Expose the Java JWT so the frontend can use it in API calls
        (session as any).accessToken = token.accessToken;
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
