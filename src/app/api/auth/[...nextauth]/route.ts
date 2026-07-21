import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { DataService } from "../../../../lib/data-service";

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const user = await DataService.findUserByEmail(credentials.email);
        if (user) {
          // Check password: admin123
          const expectedPassword = "admin123";
          if (credentials.password === expectedPassword) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              avatarUrl: user.avatarUrl || ""
            };
          }
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "kohinoor-crm-secret-2026",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
