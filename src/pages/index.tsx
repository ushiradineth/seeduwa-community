import moment from "moment";
import { getSession } from "next-auth/react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";

import { Card } from "@/components/Molecules/Card";
import Filter from "@/components/Molecules/Filter";
import Dashboard from "@/components/Templates/Dashboard";
import { ITEMS_PER_PAGE, ITEMS_PER_PAGE_FILTER, LANE_FILTER, YEARS } from "@/lib/consts";
import { prisma } from "@/server/db";

export type Member = {
  id: string;
  houseId: string;
  name: string;
  lane: string;
  payments: {
    id: string;
    month: string;
    amount: number;
  }[];
};

export type Props = {
  members: Member[];
  count: number;
  year: number;
  itemsPerPage: number;
  search: string;
  lane: string;
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
  const paymentYear = YEARS.includes(Number(context.query.paymentYear)) ? Number(context.query.paymentYear) : new Date().getFullYear();
  const itemsPerPage = ITEMS_PER_PAGE_FILTER.includes(Number(context.query.itemsPerPage))
    ? Number(context.query.itemsPerPage)
    : ITEMS_PER_PAGE;
  const lane = LANE_FILTER.includes(String(context.query.lane)) ? String(context.query.lane) : LANE_FILTER[0]!;

  const where =
    search !== ""
      ? {
          AND: [
            { active: true },
            {
              OR: [
                { name: { search: search } },
                { phoneNumber: { search: search } },
                { houseId: { search: search } },
                { lane: { search: search } },
              ],
            },
            { lane: lane !== LANE_FILTER[0] ? lane : undefined },
          ],
        }
      : {
          AND: [{ active: true }, { lane: lane !== LANE_FILTER[0] ? lane : undefined }],
        };

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
          month: {
            gte: moment().year(paymentYear).startOf("year").utcOffset(0, true).format(),
            lte: moment().year(paymentYear).endOf("year").utcOffset(0, true).format(),
          },
        },
        select: {
          id: true,
          month: true,
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
          return { ...payment, month: payment.month.toISOString() };
        }),
      })),
      count,
      year: paymentYear,
      itemsPerPage,
      search,
      lane,
    },
  };
};

export default function TableDashboard({
  members,
  count,
  year,
  itemsPerPage,
  search,
  lane,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Dashboard - Seeduwa Village Security Association</title>
      </Head>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col justify-between gap-4 p-4 md:flex-row">
          <Filter filterItems={YEARS} label="Year" paramKey="paymentYear" value={year} />
          <Filter filterItems={ITEMS_PER_PAGE_FILTER} label="Items per page" paramKey="itemsPerPage" value={itemsPerPage} />
          <Filter filterItems={LANE_FILTER} label="Lane" paramKey="lane" value={lane} />
        </Card>
        <Dashboard members={members} count={count} year={year} itemsPerPage={itemsPerPage} search={search} lane={lane} />
      </div>
    </>
  );
}
