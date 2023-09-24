import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { type GetServerSidePropsContext } from "next";

import { prisma } from "@/server/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
    };
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.user = user;
      }
      return Promise.resolve(token);
    },
    session({ session, token }) {
      if (token.user) {
        const t = token.user as {
          id: string;
        };

        session.user = {
          id: t.id,
          username: token.username as string,
        };
      }
      return Promise.resolve(session);
    },
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "string" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const admin = await prisma.admin.findUnique({ where: { username: credentials?.username } });

        if (admin) {
          const isValid = bcrypt.compareSync(credentials?.password ?? "", admin.password);

          if (isValid) {
            return {
              id: admin.id,
              username: admin.username,
            };
          }
        }

        return null;
      },
    }),
  ],
};

export const getServerAuthSession = (ctx: { req: GetServerSidePropsContext["req"]; res: GetServerSidePropsContext["res"] }) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
