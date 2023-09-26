import { getSession } from "next-auth/react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";

import Records from "@/components/Templates/Records";
import { ITEMS_PER_PAGE } from "@/lib/consts";
import { prisma } from "@/server/db";

export type Record = {
  id: string;
  amount: number;
  date: string;
  member: {
    id: string;
    name: string;
  };
};

export type Props = {
  records: Record[];
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
      ? {
          AND: [
            { active: true },
            { OR: [{ member: { name: { search: search }, houseId: { search: search }, lane: { search: search } } }] },
          ],
        }
      : { active: true };

  const records = await prisma.payment.findMany({
    take: ITEMS_PER_PAGE,
    skip: context.query.page ? (Number(context.query.page) - 1) * ITEMS_PER_PAGE : 0,
    where,
    select: {
      id: true,
      amount: true,
      date: true,
      member: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const count = await prisma.payment.count({
    where,
  });

  const total = await prisma.payment.count();

  return {
    props: {
      records: records.map((record) => ({
        ...record,
        date: record.date.toISOString(),
      })),
      count,
      total,
    },
  };
};

export default function AllMembers({ records, count, total }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Records - Seeduwa Community</title>
      </Head>
      <main className="dark flex flex-col items-center justify-center px-4">
        <Records records={records} count={count} total={total} />
      </main>
    </>
  );
}
