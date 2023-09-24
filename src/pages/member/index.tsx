import { getSession } from "next-auth/react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";

import Members from "@/components/Templates/Members";
import { ITEMS_PER_PAGE } from "@/lib/consts";
import { prisma } from "@/server/db";

export type Member = {
  id: string;
  houseId: string;
  name: string;
  lane: string;
  payment: boolean;
};

export type Props = {
  members: Member[];
  count: number;
  total: number;
};

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const session = await getSession({ ctx: context });

  if (!session) {
    return {
      redirect: {
        destination: "/auth",
        permanent: false,
      },
      props: {},
    };
  }

  const search = context.query.search ? (context.query.search as string).split(" ").join(" | ") : "";

  const where =
    search !== ""
      ? { AND: [{ active: true }, { OR: [{ name: { search: search } }, { houseId: { search: search } }, { lane: { search: search } }] }] }
      : { active: true };

  const members = await prisma.member.findMany({
    take: ITEMS_PER_PAGE,
    skip: context.query.page ? (Number(context.query.page) - 1) * ITEMS_PER_PAGE : 0,
    where,
    select: {
      id: true,
      houseId: true,
      name: true,
      lane: true,
      payments: {
        where: {
          date: {
            equals: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)),
          },
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const count = await prisma.member.count({
    where,
  });

  const total = await prisma.member.count();

  return {
    props: {
      members: members.map((member) => ({
        ...member,
        payment: member.payments.length > 0,
      })),
      count,
      total,
    },
  };
};

export default function AllMembers({ members, count, total }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Members | Seeduwa Community</title>
      </Head>
      <main className="dark flex flex-col items-center justify-center">
        <Members members={members} count={count} total={total} />
      </main>
    </>
  );
}
