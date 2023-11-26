import { getSession } from "next-auth/react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";

import Payments from "@/components/Templates/Payments";
import { ITEMS_PER_PAGE } from "@/lib/consts";
import { prisma } from "@/server/db";

export type Payment = {
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
  payments: Payment[];
  count: number;
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

  const payments = await prisma.payment.findMany({
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

  return {
    props: {
      payments: payments.map((payment) => ({
        ...payment,
        month: payment.month.toDateString(),
        paymentAt: payment.paymentAt.toDateString(),
      })),
      count,
    },
  };
};

export default function AllPayments({ payments, count }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Payments - Seeduwa Village Security Association</title>
      </Head>
      <Payments payments={payments} count={count} />
    </>
  );
}