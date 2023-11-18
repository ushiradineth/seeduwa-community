import { getSession } from "next-auth/react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";

import Records from "@/components/Templates/Records";
import { ITEMS_PER_PAGE } from "@/lib/consts";
import { prisma } from "@/server/db";

export type Record = {
  id: string;
  amount: number;
  month: string;
  paymentAt: string;
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
      month: true,
      paymentAt: true,
      member: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      month: "desc",
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
        month: record.month.toDateString(),
        paymentAt: record.paymentAt.toDateString(),
      })),
      count,
      total,
    },
  };
};

export default function AllRecords({ records, count, total }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Records - Seeduwa Village Security Association</title>
      </Head>
      <Records records={records} count={count} total={total} />
    </>
  );
}
