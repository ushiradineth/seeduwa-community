import { getSession } from "next-auth/react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";

import { Card } from "@/components/Molecules/Card";
import Filter from "@/components/Molecules/Filter";
import Records from "@/components/Templates/Records";
import { MONTHS, YEARS } from "@/lib/consts";
import { now, removeTimezone } from "@/lib/utils";
import { prisma } from "@/server/db";

export type Record = {
  id: string;
  name: string;
  amount: number;
  createdAt: string;
  recordAt: string;
  month: string;
  type: string;
};

export type Props = {
  records: Record[];
  count: number;
  year: number;
  month: string;
  search: string;
  balance: number;
  currentPayments: number;
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

  const search = context.query.search ? (context.query.search as string).split(" ").join(" <-> ") : "";
  const year = Number(context.query.filterYear ?? now().getFullYear());
  const month = String(context.query.filterMonth ?? MONTHS[now().getMonth()]);
  const monthIndex = MONTHS.findIndex((value) => value === month);
  const recordDate = removeTimezone().year(year).month(monthIndex).startOf("month").toDate();
  const where =
    search !== ""
      ? { AND: [{ month: { equals: recordDate } }, { active: true }, { OR: [{ name: { search: search } }] }] }
      : { AND: [{ month: { equals: recordDate } }, { active: true }] };

  const [records, count, income, expense, previousPayments, currentPayments] = await prisma.$transaction([
    prisma.record.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        recordAt: true,
        month: true,
        name: true,
        amount: true,
        type: true,
      },
      orderBy: { recordAt: "asc" },
    }),
    prisma.record.count({
      where,
    }),
    prisma.record.aggregate({
      where: {
        month: {
          lt: recordDate,
        },
        type: "Income",
        active: true,
        OR: [{ name: { contains: search } }],
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.record.aggregate({
      where: {
        month: {
          lt: recordDate,
        },
        type: "Expense",
        active: true,
        OR: [{ name: { contains: search } }],
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.payment.aggregate({
      where: {
        month: {
          lt: recordDate,
        },
        active: true,
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.payment.aggregate({
      where: {
        month: {
          equals: recordDate,
        },
        active: true,
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const balance = (income._sum.amount ?? 0) + (previousPayments._sum.amount ?? 0) - (expense._sum.amount ?? 0);

  return {
    props: {
      records: records.map((record) => ({
        ...record,
        createdAt: record.createdAt.toDateString(),
        recordAt: record.recordAt.toDateString(),
        month: record.month.toDateString(),
        type: record.type.toString(),
      })),
      count,
      year,
      month,
      search,
      balance,
      currentPayments: currentPayments._sum.amount ?? 0,
    },
  };
};

export default function RecordDashboard({
  records,
  count,
  search,
  year,
  month,
  balance,
  currentPayments,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Records - Seeduwa Village Security Association</title>
      </Head>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col justify-evenly gap-4 p-4">
          <div className="flex w-full gap-4">
            <Filter label="Month" filterItems={MONTHS} paramKey="filterMonth" value={month} />
            <Filter label="Year" filterItems={YEARS} paramKey="filterYear" value={String(year)} />
          </div>
        </Card>
        <Records
          records={records}
          count={count}
          year={year}
          month={month}
          search={search}
          balance={balance}
          currentPayments={currentPayments}
        />
      </div>
    </>
  );
}
