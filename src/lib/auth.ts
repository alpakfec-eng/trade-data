import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from './mongodb';
import User from '../models/User';

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('NEXTAUTH_SECRET is not defined in production environment');
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error('[AUTH] Missing credentials: email or password');
            return null;
          }

          await dbConnect();

          const user = await User.findOne({ email: credentials.email });

          if (!user) {
            console.error('[AUTH] User not found:', credentials.email);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password as string
          );

          if (!isPasswordValid) {
            console.error('[AUTH] Invalid password for user:', credentials.email);
            return null;
          }

          if (!user.approved) {
            console.error('[AUTH] User not approved:', credentials.email);
            return null;
          }

          console.log('[AUTH] User signed in successfully:', credentials.email);

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('[AUTH] Authorization error:', error instanceof Error ? error.message : String(error));
          if (error instanceof Error) {
            console.error('[AUTH] Stack:', error.stack);
          }
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('[AUTH:EVENT] User signed in:', user?.email);
    },
    async error({ error }) {
      console.error('[AUTH:EVENT] Auth error:', error);
    },
  },
  pages: {
    signIn: '/login',
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
});