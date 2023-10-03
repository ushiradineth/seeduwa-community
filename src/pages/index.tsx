import moment from "moment";
import { getSession } from "next-auth/react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";

import Filter from "@/components/Molecules/Filter";
import Dashboard from "@/components/Templates/Dashboard";
import { ITEMS_PER_PAGE, ITEMS_PER_PAGE_FILTER, YEARS } from "@/lib/consts";
import { prisma } from "@/server/db";

export type Member = {
  id: string;
  houseId: string;
  name: string;
  lane: string;
  payments: {
    id: string;
    date: string;
    amount: number;
  }[];
};

export type Props = {
  members: Member[];
  count: number;
  year: number;
  itemsPerPage: number;
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
  const recordYear = YEARS.includes(Number(context.query.recordYear)) ? Number(context.query.recordYear) : new Date().getFullYear();
  const itemsPerPage = ITEMS_PER_PAGE_FILTER.includes(Number(context.query.itemsPerPage))
    ? Number(context.query.itemsPerPage)
    : ITEMS_PER_PAGE;

  const where =
    search !== ""
      ? { AND: [{ active: true }, { OR: [{ name: { search: search } }, { houseId: { search: search } }, { lane: { search: search } }] }] }
      : { active: true };

  const members = await prisma.member.findMany({
    take: itemsPerPage,
    skip: context.query.page ? (Number(context.query.page) - 1) * itemsPerPage : 0,
    where,
    select: {
      id: true,
      houseId: true,
      name: true,
      lane: true,
      payments: {
        where: {
          active: true,
          date: {
            gt: moment().year(recordYear).startOf("year").toDate(),
            lt: moment().year(recordYear).endOf("year").toDate(),
          },
        },
        select: {
          id: true,
          date: true,
          amount: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const count = await prisma.member.count({
    where,
  });

  return {
    props: {
      members: members.map((member) => ({
        ...member,
        payments: member.payments.map((payment) => {
          return { ...payment, date: payment.date.toISOString() };
        }),
      })),
      count,
      year: recordYear,
      itemsPerPage,
    },
  };
};

export default function TableDashboard({ members, count, year, itemsPerPage }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Dashboard - Seeduwa Village Security Association</title>
      </Head>
      <main className="dark flex flex-col items-center justify-center px-4">
        <div className="flex w-full justify-between gap-8 py-4">
          <Filter filterItems={YEARS} label="Year" paramKey="recordYear" value={year} />
          <Filter filterItems={ITEMS_PER_PAGE_FILTER} label="Items per page" paramKey="itemsPerPage" value={itemsPerPage} />
        </div>
        <Dashboard members={members} count={count} year={year} itemsPerPage={itemsPerPage} />
      </main>
    </>
  );
}
