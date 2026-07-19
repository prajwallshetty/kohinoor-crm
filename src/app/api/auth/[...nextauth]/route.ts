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

async function authHandler(req: Request, res: any) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) {
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("10.") || host.includes("192.") ? "http" : "https";
    process.env.NEXTAUTH_URL = `${protocol}://${host}`;
  }
  return handler(req, res);
}

export { authHandler as GET, authHandler as POST };
