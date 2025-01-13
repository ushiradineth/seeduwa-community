import { getSession } from "next-auth/react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";

import { Card } from "@/components/Molecules/Card";
import Filter from "@/components/Molecules/Filter";
import Payments from "@/components/Templates/Payments";
import { ITEMS_PER_PAGE, MONTHS, YEARS } from "@/lib/consts";
import { now, removeTimezone } from "@/lib/utils";
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
  totalForTheMonth: number;
  year: number;
  month: string;
  search: string;
  page: number;
  itemPerPage: number;
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
  const year = Number(context.query.filterYear ?? now().getFullYear());
  const month = String(context.query.filterMonth ?? MONTHS[now().getMonth()]);
  const monthIndex = MONTHS.findIndex((value) => value === month);
  const recordDate = removeTimezone().year(year).month(monthIndex);
  const paymentAt = { gte: recordDate.startOf("month").toDate(), lte: recordDate.endOf("month").toDate() };

  const defaultQuery = { AND: [{ paymentAt }, { active: true }] };
  const where =
    search !== ""
      ? {
          AND: [
            { paymentAt },
            { active: true },
            { OR: [{ member: { name: { search: search }, houseId: { search: search }, lane: { search: search } } }] },
          ],
        }
      : defaultQuery;

  const page = Number(context.query.page ?? 1);

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
      createdAt: "desc",
    },
  });

  const count = await prisma.payment.count({
    where,
  });

  const totalForTheMonth = (
    await prisma.payment.findMany({
      where: defaultQuery,
      select: {
        amount: true,
      },
    })
  ).reduce((acc, curr) => acc + curr.amount, 0);

  return {
    props: {
      payments: payments.map((payment) => ({
        ...payment,
        month: payment.month.toDateString(),
        paymentAt: payment.paymentAt.toDateString(),
      })),
      count,
      totalForTheMonth,
      year,
      month,
      search,
      page,
      itemPerPage: ITEMS_PER_PAGE,
    },
  };
};

export default function PaymentsDashboard({
  payments,
  count,
  totalForTheMonth,
  year,
  month,
  search,
  itemPerPage,
  page,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Payments - Seeduwa Village Security Association</title>
      </Head>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col justify-evenly gap-4 p-4">
          <div className="flex w-full gap-4">
            <Filter label="Month" filterItems={MONTHS} paramKey="filterMonth" value={month} />
            <Filter label="Year" filterItems={YEARS} paramKey="filterYear" value={String(year)} />
          </div>
        </Card>
        <Payments
          payments={payments}
          count={count}
          totalForTheMonth={totalForTheMonth}
          year={year}
          month={month}
          search={search}
          itemPerPage={itemPerPage}
          page={page}
        />
      </div>
    </>
  );
}
