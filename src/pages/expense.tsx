import moment from "moment";
import { getSession } from "next-auth/react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";

import { Card } from "@/components/Molecules/Card";
import Filter from "@/components/Molecules/Filter";
import Expenses from "@/components/Templates/Expenses";
import { ITEMS_PER_PAGE, ITEMS_PER_PAGE_FILTER, MONTHS, YEARS } from "@/lib/consts";
import { prisma } from "@/server/db";

export type Expense = {
  id: string;
  name: string;
  amount: number;
  createdAt: string;
  expenseAt: string;
  month: string;
};

export type Props = {
  expenses: Expense[];
  count: number;
  year: number;
  month: string;
  itemsPerPage: number;
  search: string;
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
  const year = Number(context.query.filterYear ?? new Date().getFullYear());
  const month = String(context.query.filterMonth ?? MONTHS[new Date().getMonth()]);
  const monthIndex = MONTHS.findIndex((value) => value === month);
  const expenseDate = moment().year(year).month(monthIndex).startOf("month").utcOffset(0, true).toDate();
  const itemsPerPage = ITEMS_PER_PAGE_FILTER.includes(Number(context.query.itemsPerPage))
    ? Number(context.query.itemsPerPage)
    : ITEMS_PER_PAGE;
  const where =
    search !== ""
      ? { AND: [{ month: { equals: expenseDate } }, { active: true }, { OR: [{ name: { search: search } }] }] }
      : { AND: [{ month: { equals: expenseDate } }, { active: true }] };

  const expenses = await prisma.expense.findMany({
    take: itemsPerPage,
    skip: context.query.page ? (Number(context.query.page) - 1) * itemsPerPage : 0,
    where,
    select: {
      id: true,
      createdAt: true,
      expenseAt: true,
      month: true,
      name: true,
      amount: true,
    },
    orderBy: { month: "desc" },
  });

  const count = await prisma.expense.count({
    where,
  });

  return {
    props: {
      expenses: expenses.map((expense) => ({
        ...expense,
        createdAt: expense.createdAt.toDateString(),
        expenseAt: expense.expenseAt.toDateString(),
        month: expense.month.toDateString(),
      })),
      count,
      year,
      month,
      itemsPerPage,
      search,
    },
  };
};

export default function ExpenseDashboard({
  expenses,
  count,
  itemsPerPage,
  search,
  year,
  month,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Expenses - Seeduwa Village Security Association</title>
      </Head>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col justify-between gap-4 p-4 md:flex-row">
          <Filter label="Month" filterItems={MONTHS} paramKey="filterMonth" value={month} />
          <Filter label="Year" filterItems={YEARS} paramKey="filterYear" value={String(year)} />
          <Filter filterItems={ITEMS_PER_PAGE_FILTER} label="Items per page" paramKey="itemsPerPage" value={itemsPerPage} />
        </Card>
        <Expenses expenses={expenses} count={count} year={year} month={month} itemsPerPage={itemsPerPage} search={search} />
      </div>
    </>
  );
}
