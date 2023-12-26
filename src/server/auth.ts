import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { log } from "next-axiom";
import { type GetServerSidePropsContext } from "next";

import { prisma } from "@/server/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
    };
  }

  interface JWT {
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
    session({ session, token }) {
      if (token.user) {
        const t = token.user as {
          id: string;
          username: string;
        };

        session.user = {
          id: t.id,
          username: t.username,
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
            log.info("Admin authorized", { id: admin.id, username: admin.username });

            return {
              id: admin.id,
              username: admin.username,
            };
          }

          log.warn("Admin failed to authorize", { id: admin.id, username: admin.username });
        }

        log.warn("Admin not found", { username: credentials?.username });
        return null;
      },
    }),
  ],
};

export const getServerAuthSession = (ctx: { req: GetServerSidePropsContext["req"]; res: GetServerSidePropsContext["res"] }) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
