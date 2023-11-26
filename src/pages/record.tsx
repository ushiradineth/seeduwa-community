import moment from "moment";
import { getSession } from "next-auth/react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";

import { Card } from "@/components/Molecules/Card";
import Filter from "@/components/Molecules/Filter";
import Records from "@/components/Templates/Records";
import { ITEMS_PER_PAGE, ITEMS_PER_PAGE_FILTER, MONTHS, YEARS } from "@/lib/consts";
import { prisma } from "@/server/db";

export type Record = {
  id: string;
  name: string;
  amount: number;
  createdAt: string;
  recordAt: string;
  month: string;
};

export type Props = {
  records: Record[];
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
  const recordDate = moment().year(year).month(monthIndex).startOf("month").utcOffset(0, true).toDate();
  const itemsPerPage = ITEMS_PER_PAGE_FILTER.includes(Number(context.query.itemsPerPage))
    ? Number(context.query.itemsPerPage)
    : ITEMS_PER_PAGE;
  const where =
    search !== ""
      ? { AND: [{ month: { equals: recordDate } }, { active: true }, { OR: [{ name: { search: search } }] }] }
      : { AND: [{ month: { equals: recordDate } }, { active: true }] };

  const records = await prisma.record.findMany({
    take: itemsPerPage,
    skip: context.query.page ? (Number(context.query.page) - 1) * itemsPerPage : 0,
    where,
    select: {
      id: true,
      createdAt: true,
      recordAt: true,
      month: true,
      name: true,
      amount: true,
    },
    orderBy: { month: "desc" },
  });

  const count = await prisma.record.count({
    where,
  });

  return {
    props: {
      records: records.map((record) => ({
        ...record,
        createdAt: record.createdAt.toDateString(),
        recordAt: record.recordAt.toDateString(),
        month: record.month.toDateString(),
      })),
      count,
      year,
      month,
      itemsPerPage,
      search,
    },
  };
};

export default function RecordDashboard({
  records,
  count,
  itemsPerPage,
  search,
  year,
  month,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Records - Seeduwa Village Security Association</title>
      </Head>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col justify-between gap-4 p-4 md:flex-row">
          <Filter label="Month" filterItems={MONTHS} paramKey="filterMonth" value={month} />
          <Filter label="Year" filterItems={YEARS} paramKey="filterYear" value={String(year)} />
          <Filter filterItems={ITEMS_PER_PAGE_FILTER} label="Items per page" paramKey="itemsPerPage" value={itemsPerPage} />
        </Card>
        <Records records={records} count={count} year={year} month={month} itemsPerPage={itemsPerPage} search={search} />
      </div>
    </>
  );
}
